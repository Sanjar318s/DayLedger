const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { notifyUser, isUserOnline } = require('../socket');
const { checkAchievements } = require('../services/achievements');

const router = express.Router();
router.use(authenticateToken);

// Отправить запрос дружбы
router.post('/request', async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) return res.status(400).json({ error: 'publicId required' });
  try {
    const receiver = await pool.query('SELECT id FROM users WHERE public_id = $1', [publicId]);
    if (receiver.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const receiverId = receiver.rows[0].id;
    if (receiverId === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    // Проверить, не заблокирован ли получатель
    const blockCheck = await pool.query('SELECT 1 FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2', [req.user.id, receiverId]);
    if (blockCheck.rows.length > 0) return res.status(403).json({ error: 'User blocked' });
    // Также проверить, не заблокировал ли нас получатель
    const reverseBlock = await pool.query('SELECT 1 FROM blocked_users WHERE user_id = $2 AND blocked_user_id = $1', [req.user.id, receiverId]);
    if (reverseBlock.rows.length > 0) return res.status(403).json({ error: 'You are blocked by this user' });

    const existing = await pool.query(
      'SELECT * FROM friend_requests WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)',
      [req.user.id, receiverId]
    );
    if (existing.rows.length > 0) {
      const reqItem = existing.rows[0];
      if (reqItem.status === 'pending') {
        return res.status(400).json({ error: 'Request already pending' });
      } else if (reqItem.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      } else if (reqItem.status === 'rejected') {
        // Удаляем старый отклоненный запрос и разрешаем новый
        await pool.query('DELETE FROM friend_requests WHERE id = $1', [reqItem.id]);
      }
    }

    await pool.query(
      'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
      [req.user.id, receiverId, 'pending']
    );

    // Отправим уведомление получателю
    const senderData = await pool.query('SELECT public_id, nickname FROM users WHERE id = $1', [req.user.id]);
    notifyUser(receiverId, 'friend_request', {
      type: 'incoming',
      from_public_id: senderData.rows[0].public_id,
      from_nickname: senderData.rows[0].nickname,
    });

    res.status(201).json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Принять запрос дружбы
router.patch('/accept/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE friend_requests SET status = 'accepted' WHERE id = $1 AND receiver_id = $2 AND status = 'pending' RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const request = result.rows[0];

    // Уведомить отправителя, что запрос принят
    const receiverData = await pool.query('SELECT public_id, nickname FROM users WHERE id = $1', [req.user.id]);
    notifyUser(request.sender_id, 'friend_response', {
      type: 'accepted',
      from_public_id: receiverData.rows[0].public_id,
      from_nickname: receiverData.rows[0].nickname,
    });

    await checkAchievements(req.user.id); // для того, кто принял
    await checkAchievements(request.sender_id); // для отправителя

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Отклонить запрос дружбы
router.patch('/reject/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE friend_requests SET status = 'rejected' WHERE id = $1 AND receiver_id = $2 AND status = 'pending' RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const request = result.rows[0];

    // Уведомить отправителя
    const receiverData = await pool.query('SELECT public_id, nickname FROM users WHERE id = $1', [req.user.id]);
    notifyUser(request.sender_id, 'friend_response', {
      type: 'rejected',
      from_public_id: receiverData.rows[0].public_id,
      from_nickname: receiverData.rows[0].nickname,
    });

    res.json({ message: 'Friend request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить список друзей (принятые запросы)
router.get('/', async (req, res) => {
  try {
    const friends = await pool.query(
      `SELECT u.id, u.email, u.public_id, u.nickname, u.avatar_url,
              af.css_style as active_frame_css
       FROM users u
       JOIN friend_requests fr ON (fr.sender_id = u.id OR fr.receiver_id = u.id)
       LEFT JOIN avatar_frames af ON u.active_frame_id = af.id
       WHERE (fr.sender_id = $1 OR fr.receiver_id = $1) AND fr.status = 'accepted' AND u.id != $1`,
      [req.user.id]
    );
    const list = friends.rows.map(f => ({
      ...f,
      is_online: isUserOnline(f.id),
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить входящие/исходящие запросы
router.get('/requests', async (req, res) => {
  try {
    const incoming = await pool.query(
      `SELECT fr.id, fr.status, fr.created_at, u.public_id, u.nickname, u.avatar_url, u.email
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'`,
      [req.user.id]
    );
    const outgoing = await pool.query(
      `SELECT fr.id, fr.status, fr.created_at, u.public_id, u.nickname, u.avatar_url, u.email
       FROM friend_requests fr
       JOIN users u ON fr.receiver_id = u.id
       WHERE fr.sender_id = $1 AND fr.status = 'pending'`,
      [req.user.id]
    );
    res.json({ incoming: incoming.rows, outgoing: outgoing.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить друга (удалить accepted-запись) — принимает public_id друга
router.delete('/:publicId', async (req, res) => {
  const { publicId } = req.params;
  try {
    const friendRes = await pool.query('SELECT id FROM users WHERE public_id = $1', [publicId]);
    if (friendRes.rows.length === 0) return res.status(404).json({ error: 'Friend not found' });
    const friendId = friendRes.rows[0].id;
    const result = await pool.query(
      "DELETE FROM friend_requests WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND status = 'accepted' RETURNING *",
      [req.user.id, friendId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Friend not found' });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Заблокировать пользователя (по public_id)
router.post('/block', async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) return res.status(400).json({ error: 'publicId required' });
  try {
    const blocked = await pool.query('SELECT id FROM users WHERE public_id = $1', [publicId]);
    if (blocked.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const blockedId = blocked.rows[0].id;
    if (blockedId === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });

    // Вставить запись о блокировке
    await pool.query(
      'INSERT INTO blocked_users (user_id, blocked_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, blockedId]
    );

    // Удалить из друзей, если были (обе стороны)
    await pool.query(
      "DELETE FROM friend_requests WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)",
      [req.user.id, blockedId]
    );

    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Разблокировать пользователя
router.delete('/block/:blockedId', async (req, res) => {
  const { blockedId } = req.params;
  try {
    await pool.query('DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2', [req.user.id, blockedId]);
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Список заблокированных пользователей
router.get('/blocked', async (req, res) => {
  try {
    const list = await pool.query(
      'SELECT u.id, u.public_id, u.nickname, u.avatar_url FROM blocked_users b JOIN users u ON b.blocked_user_id = u.id WHERE b.user_id = $1',
      [req.user.id]
    );
    res.json(list.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
