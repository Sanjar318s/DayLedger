const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Получить все рамки с флагом разблокировки
router.get('/', async (req, res) => {
  try {
    const frames = await pool.query('SELECT * FROM avatar_frames ORDER BY required_achievements ASC');
    const achCountRes = await pool.query('SELECT COUNT(*) FROM user_achievements WHERE user_id = $1', [req.user.id]);
    const achCount = parseInt(achCountRes.rows[0].count, 10);
    const userFrames = await pool.query('SELECT frame_id FROM user_frames WHERE user_id = $1', [req.user.id]);
    const unlockedSet = new Set(userFrames.rows.map(r => r.frame_id));

    const result = [];
    for (const frame of frames.rows) {
      const unlocked = unlockedSet.has(frame.id) || frame.required_achievements <= achCount;
      if (unlocked && !unlockedSet.has(frame.id)) {
        await pool.query('INSERT INTO user_frames (user_id, frame_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, frame.id]);
      }
      result.push({ ...frame, unlocked });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Установить активную рамку
router.patch('/active', async (req, res) => {
  const { frame_id } = req.body;
  try {
    // Проверить разблокировку
    const frame = await pool.query('SELECT * FROM avatar_frames WHERE id = $1', [frame_id]);
    if (frame.rows.length === 0) return res.status(404).json({ error: 'Frame not found' });

    const achCountRes = await pool.query('SELECT COUNT(*) FROM user_achievements WHERE user_id = $1', [req.user.id]);
    const achCount = parseInt(achCountRes.rows[0].count, 10);
    if (frame.rows[0].required_achievements > achCount) {
      return res.status(403).json({ error: 'Frame not unlocked yet' });
    }

    await pool.query('UPDATE users SET active_frame_id = $1 WHERE id = $2', [frame_id, req.user.id]);
    res.json({ message: 'Active frame updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Получить активную рамку текущего пользователя
router.get('/active', async (req, res) => {
  try {
    const user = await pool.query('SELECT active_frame_id FROM users WHERE id = $1', [req.user.id]);
    if (user.rows[0].active_frame_id) {
      const frame = await pool.query('SELECT * FROM avatar_frames WHERE id = $1', [user.rows[0].active_frame_id]);
      if (frame.rows.length > 0) return res.json(frame.rows[0]);
    }
    res.json(null);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
