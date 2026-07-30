const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Получить профиль пользователя по public_id
router.get('/:publicId', async (req, res) => {
  const { publicId } = req.params;
  try {
    const userRes = await pool.query(
      `SELECT u.*, af.css_style as active_frame_css
       FROM users u
       LEFT JOIN avatar_frames af ON u.active_frame_id = af.id
       WHERE u.public_id = $1`,
      [publicId]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];
    const isOwner = user.id === req.user.id;

    // Подсчёты (с учётом настроек видимости)
    const notesCount = user.show_notes_count || isOwner
      ? (await pool.query('SELECT COUNT(*) FROM entries WHERE user_id = $1', [user.id])).rows[0].count
      : -1;

    const friendsCount = user.show_friends_count || isOwner
      ? (await pool.query(`SELECT COUNT(*) FROM friend_requests WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted'`, [user.id])).rows[0].count
      : -1;

    const projectsCount = user.show_projects_count || isOwner
      ? (await pool.query('SELECT COUNT(*) FROM entry_shares WHERE (owner_id = $1 OR friend_id = $1) AND accepted = TRUE', [user.id])).rows[0].count
      : -1;

    // Прогресс уровня (100 XP на уровень)
    const xpForNextLevel = 100;
    const currentLevelXP = user.points % xpForNextLevel;
    const progress = Math.round((currentLevelXP / xpForNextLevel) * 100);

    const response = {
      public_id: user.public_id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      active_frame_css: user.active_frame_css || null,
      level: user.level,
      points: user.points,
      xpForNextLevel,
      currentLevelXP,
      progress,
      notesCount: parseInt(notesCount, 10),
      friendsCount: parseInt(friendsCount, 10),
      projectsCount: parseInt(projectsCount, 10),
      isOwner,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Обновить настройки видимости
router.patch('/settings', async (req, res) => {
  const allowedFields = ['show_notes_count', 'show_friends_count', 'show_projects_count'];
  const body = req.body;
  const updates = [];
  const values = [];
  let counter = 1;
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${counter++}`);
      values.push(body[field]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.user.id);
  try {
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${counter}`, values);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
