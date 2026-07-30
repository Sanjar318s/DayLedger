const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/unread/count', async (req, res) => {
  try {
    const count = await pool.query(
      `SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ count: parseInt(count.rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить сообщения с другом
router.get('/:friendId', async (req, res) => {
  const { friendId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [req.user.id, friendId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Пометить все сообщения как прочитанные
router.patch('/read-all', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE messages SET read_at = now()
       WHERE receiver_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ updated: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Пометить все сообщения от конкретного друга как прочитанные
router.patch('/read/:friendId', async (req, res) => {
  const { friendId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE messages SET read_at = now()
       WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL
       RETURNING id`,
      [friendId, req.user.id]
    );
    res.json({ updated: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
