const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { notifyUser } = require('../socket');

const router = express.Router();
router.use(authenticateToken);

// Поделиться записью с другом
router.post('/:entryId', async (req, res) => {
  const { entryId } = req.params;
  const { friendPublicId, permission } = req.body;
  if (!friendPublicId || !permission) return res.status(400).json({ error: 'friendPublicId and permission required' });
  try {
    const entry = await pool.query('SELECT * FROM entries WHERE id = $1 AND user_id = $2', [entryId, req.user.id]);
    if (entry.rows.length === 0) return res.status(404).json({ error: 'Entry not found or not yours' });

    const friend = await pool.query('SELECT id FROM users WHERE public_id = $1', [friendPublicId]);
    if (friend.rows.length === 0) return res.status(404).json({ error: 'Friend not found' });
    const friendId = friend.rows[0].id;

    const friendship = await pool.query(
      `SELECT 1 FROM friend_requests WHERE ((sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)) AND status = 'accepted'`,
      [req.user.id, friendId]
    );
    if (friendship.rows.length === 0) return res.status(403).json({ error: 'Not friends' });

    await pool.query(
      `INSERT INTO entry_shares (entry_id, owner_id, friend_id, permission, accepted)
       VALUES ($1, $2, $3, $4, FALSE)
       ON CONFLICT (entry_id, friend_id) DO UPDATE SET permission = $4, accepted = FALSE`,
      [entryId, req.user.id, friendId, permission]
    );

    const owner = await pool.query('SELECT public_id FROM users WHERE id = $1', [req.user.id]);
    notifyUser(friendId, 'share_invite', {
      entry_id: entryId,
      entry_title: entry.rows[0].title,
      from_public_id: owner.rows[0].public_id,
    });

    res.status(201).json({ message: 'Share invite sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Принять/отклонить приглашение
router.patch('/:shareId', async (req, res) => {
  const { shareId } = req.params;
  const { accept, permission } = req.body;

  try {
    // Логика принятия/отклонения приглашения
    if (accept !== undefined) {
      if (accept) {
        const result = await pool.query(
          `UPDATE entry_shares SET accepted = TRUE WHERE id = $1 AND friend_id = $2 RETURNING *`,
          [shareId, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Share not found' });
        res.json({ message: 'Share accepted' });
      } else {
        await pool.query('DELETE FROM entry_shares WHERE id = $1 AND friend_id = $2', [shareId, req.user.id]);
        res.json({ message: 'Share rejected' });
      }
    }
    // Изменение прав доступа (только владельцем)
    else if (permission) {
      const result = await pool.query(
        `UPDATE entry_shares SET permission = $1 WHERE id = $2 AND owner_id = $3 RETURNING *`,
        [permission, shareId, req.user.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Share not found or not authorized' });
      res.json(result.rows[0]);
    } else {
      res.status(400).json({ error: 'No action specified' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить записи, которыми поделились со мной (принятые)
router.get('/shared-with-me', async (req, res) => {
  try {
    const shared = await pool.query(
      `SELECT e.*, es.permission, es.id as share_id, u.public_id as owner_public_id, u.nickname as owner_nickname
       FROM entry_shares es
       JOIN entries e ON es.entry_id = e.id
       JOIN users u ON es.owner_id = u.id
       WHERE es.friend_id = $1 AND es.accepted = TRUE`,
      [req.user.id]
    );
    res.json(shared.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить, кому я дал доступ
router.get('/shared-by-me', async (req, res) => {
  try {
    const shares = await pool.query(
      `SELECT es.*, e.title as entry_title, e.title, u.public_id as friend_public_id, u.nickname as friend_nickname
       FROM entry_shares es
       JOIN entries e ON es.entry_id = e.id
       JOIN users u ON es.friend_id = u.id
       WHERE es.owner_id = $1`,
      [req.user.id]
    );
    res.json(shares.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить доступ
router.delete('/:shareId', async (req, res) => {
  const { shareId } = req.params;
  try {
    await pool.query(
      'DELETE FROM entry_shares WHERE id = $1 AND (owner_id = $2 OR friend_id = $2)',
      [shareId, req.user.id]
    );
    res.json({ message: 'Share removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Входящие (pending) приглашения
router.get('/invites', async (req, res) => {
  try {
    const invites = await pool.query(
      `SELECT es.*, e.title, u.public_id as owner_public_id, u.nickname as owner_nickname
       FROM entry_shares es
       JOIN entries e ON es.entry_id = e.id
       JOIN users u ON es.owner_id = u.id
       WHERE es.friend_id = $1 AND es.accepted = FALSE`,
      [req.user.id]
    );
    res.json(invites.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
