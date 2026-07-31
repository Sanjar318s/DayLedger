const { v4: uuidv4 } = require('uuid');
const pool = require('./db');
const { checkAchievements } = require('./services/achievements');
const { sendPushNotification } = require('./services/pushNotifications');

let io;
const onlineUsers = new Map(); // userId -> Set<socketId>

function setupSocket(serverIo) {
  io = serverIo;

  // middleware для запоминания userId из query
  io.use((socket, next) => {
    const userId = socket.handshake.query.userId;
    if (userId) socket.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (!userId) return;

    // Добавляем в онлайн
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Уведомляем друзей, что пользователь онлайн
    notifyFriendsStatus(userId, true);

    socket.on('join', ({ userId: uid }) => {
      if (uid) {
        socket.join(`user:${uid}`);
      }
    });

    // Обработка отправки сообщения
    socket.on('private_message', async ({ to, text, replyToId }) => {
      const senderId = userId;
      if (!senderId || !to || !text) return;

      const id = uuidv4();
      const createdAt = new Date().toISOString();

      try {
        await pool.query(
          'INSERT INTO messages (id, sender_id, receiver_id, text, reply_to_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, senderId, to, text, replyToId || null, createdAt]
        );

        await checkAchievements(senderId);

        const message = {
          id,
          sender_id: senderId,
          receiver_id: to,
          text,
          reply_to_id: replyToId || null,
          created_at: createdAt,
          read_at: null,
        };

        // Доставляем получателю и отправителю
        io.to(`user:${to}`).emit('new_message', message);
        io.to(`user:${senderId}`).emit('new_message', message);

        // Push-уведомление получателю, если он оффлайн
        if (!isUserOnline(to)) {
          try {
            const senderRes = await pool.query(
              'SELECT public_id, nickname FROM users WHERE id = $1',
              [senderId]
            );
            const sender = senderRes.rows[0] || {};
            const senderName = sender.nickname || ('#' + (sender.public_id || '')).trim();
            await sendPushNotification(to, {
              title: senderName || 'Новое сообщение',
              body: text,
              url: '/chat',
              tag: 'chat',
            });
          } catch (err) {
            console.error('Message push error:', err);
          }
        }
      } catch (err) {
        console.error('Message save error:', err);
      }
    });

    // Обработка пометки прочтения
    socket.on('mark_read', async ({ friendId }) => {
      const readerId = userId;
      if (!friendId) return;

      try {
        // Обновляем все непрочитанные сообщения от friendId к readerId
        const result = await pool.query(
          `UPDATE messages SET read_at = now()
           WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL
           RETURNING id`,
          [friendId, readerId]
        );

        if (result.rows.length > 0) {
          // Уведомляем отправителя, что сообщения прочитаны
          io.to(`user:${friendId}`).emit('messages_read', {
            read_by: readerId,
            message_ids: result.rows.map(r => r.id),
          });
        }
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    // Call signaling
    socket.on('call_user', ({ to, callType }) => {
      const callerId = userId;
      io.to(`user:${to}`).emit('incoming_call', {
        from: callerId,
        callType,
      });
    });

    socket.on('call_accepted', ({ to }) => {
      io.to(`user:${to}`).emit('call_accepted', {
        from: userId,
      });
    });

    socket.on('call_rejected', ({ to }) => {
      io.to(`user:${to}`).emit('call_rejected', {
        from: userId,
      });
    });

    socket.on('call_ended', ({ to }) => {
      io.to(`user:${to}`).emit('call_ended', {
        from: userId,
      });
    });

    socket.on('offer', ({ to, offer }) => {
      io.to(`user:${to}`).emit('offer', {
        from: userId,
        offer,
      });
    });

    socket.on('answer', ({ to, answer }) => {
      io.to(`user:${to}`).emit('answer', {
        from: userId,
        answer,
      });
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
      io.to(`user:${to}`).emit('ice_candidate', {
        from: userId,
        candidate,
      });
    });

    // Отключение
    socket.on('disconnect', () => {
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
          // Уведомляем друзей, что офлайн
          notifyFriendsStatus(userId, false);
        }
      }
    });
  });
}

async function notifyFriendsStatus(userId, isOnline) {
  try {
    // Получить список друзей
    const friends = await pool.query(
      `SELECT u.id FROM users u
       JOIN friend_requests fr ON (fr.sender_id = u.id OR fr.receiver_id = u.id)
       WHERE (fr.sender_id = $1 OR fr.receiver_id = $1) AND fr.status = 'accepted' AND u.id != $1`,
      [userId]
    );
    friends.rows.forEach(friend => {
      io.to(`user:${friend.id}`).emit('friend_status', {
        userId,
        online: isOnline,
      });
    });
  } catch (err) {
    console.error('notifyFriendsStatus error:', err);
  }
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

function notifyUser(userId, event, data) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

module.exports = { setupSocket, notifyUser, isUserOnline };
