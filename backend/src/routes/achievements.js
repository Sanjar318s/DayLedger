const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    // Все достижения
    const all = await pool.query('SELECT * FROM achievements ORDER BY chain, threshold');
    // Разблокированные текущим пользователем
    const userAch = await pool.query('SELECT achievement_id FROM user_achievements WHERE user_id = $1', [req.user.id]);
    const unlocked = userAch.rows.map(r => r.achievement_id);

    // Статистика для прогресса
    const notesCount = parseInt((await pool.query('SELECT COUNT(*) FROM entries WHERE user_id = $1', [req.user.id])).rows[0].count, 10);
    const doneCount = parseInt((await pool.query("SELECT COUNT(*) FROM entries WHERE user_id = $1 AND is_done = true", [req.user.id])).rows[0].count, 10);
    const friendsCount = parseInt((await pool.query("SELECT COUNT(*) FROM friend_requests WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted'", [req.user.id])).rows[0].count, 10);
    const messagesCount = parseInt((await pool.query('SELECT COUNT(*) FROM messages WHERE sender_id = $1', [req.user.id])).rows[0].count, 10);

    const stats = { notes: notesCount, done: doneCount, friends: friendsCount, messages: messagesCount };

    // Добавляем информацию о прогрессе в каждое достижение
    const achievements = all.rows.map(a => {
      const current = stats[a.chain] || 0;
      const nextThreshold = a.threshold;
      const achieved = unlocked.includes(a.id);
      return {
        ...a,
        unlocked: achieved,
        current_value: current,
        next_threshold: nextThreshold,
        progress: achieved ? 100 : Math.min(100, Math.round((current / nextThreshold) * 100)),
      };
    });

    res.json(achievements);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
