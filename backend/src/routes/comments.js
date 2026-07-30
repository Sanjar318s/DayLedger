const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { notifyUser } = require('../socket');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authenticateToken);

// Получить комментарии к записи (если есть доступ)
router.get('/:entryId', async (req, res) => {
  const { entryId } = req.params;
  try {
    // Проверить доступ
    const entry = await pool.query('SELECT * FROM entries WHERE id = $1', [entryId]);
    if (entry.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });

    const entryData = entry.rows[0];
    let hasAccess = entryData.user_id === req.user.id;

    if (!hasAccess) {
      const share = await pool.query(
        'SELECT 1 FROM entry_shares WHERE entry_id = $1 AND friend_id = $2 AND accepted = TRUE',
        [entryId, req.user.id]
      );
      hasAccess = share.rows.length > 0;
    }

    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const comments = await pool.query(
      `SELECT ec.*, u.nickname, u.public_id, u.avatar_url
       FROM entry_comments ec
       JOIN users u ON ec.user_id = u.id
       WHERE ec.entry_id = $1
       ORDER BY ec.created_at ASC`,
      [entryId]
    );
    res.json(comments.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавить комментарий (только если есть права edit на запись)
router.post('/:entryId', async (req, res) => {
  const { entryId } = req.params;
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });

  try {
    const entry = await pool.query('SELECT * FROM entries WHERE id = $1', [entryId]);
    if (entry.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });

    const entryData = entry.rows[0];
    let canEdit = entryData.user_id === req.user.id;

    if (!canEdit) {
      const share = await pool.query(
        'SELECT permission FROM entry_shares WHERE entry_id = $1 AND friend_id = $2 AND accepted = TRUE',
        [entryId, req.user.id]
      );
      if (share.rows.length > 0 && share.rows[0].permission === 'edit') {
        canEdit = true;
      }
    }

    if (!canEdit) return res.status(403).json({ error: 'Only editors can add comments' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO entry_comments (id, entry_id, user_id, text) VALUES ($1, $2, $3, $4)',
      [id, entryId, req.user.id, text.trim()]
    );

    const comment = await pool.query(
      `SELECT ec.*, u.nickname, u.public_id, u.avatar_url
       FROM entry_comments ec
       JOIN users u ON ec.user_id = u.id
       WHERE ec.id = $1`,
      [id]
    );

    // Уведомить владельца и других редакторов
    const participants = await pool.query(
      `SELECT friend_id FROM entry_shares WHERE entry_id = $1 AND accepted = TRUE AND permission = 'edit'
       UNION SELECT $2 AS friend_id`,
      [entryId, entryData.user_id]
    );
    participants.rows.forEach(p => {
      if (p.friend_id !== req.user.id) { // не уведомляем самого себя
        notifyUser(p.friend_id, 'new_comment', { entryId, comment: comment.rows[0] });
      }
    });

    res.status(201).json(comment.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Удалить комментарий (владелец заметки или автор комментария)
router.delete('/:entryId/:commentId', async (req, res) => {
  const { entryId, commentId } = req.params;
  try {
    const entry = await pool.query('SELECT user_id FROM entries WHERE id = $1', [entryId]);
    if (entry.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });

    const comment = await pool.query('SELECT user_id FROM entry_comments WHERE id = $1', [commentId]);
    if (comment.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });

    const isOwner = entry.rows[0].user_id === req.user.id;
    const isAuthor = comment.rows[0].user_id === req.user.id;

    if (!isOwner && !isAuthor) return res.status(403).json({ error: 'Access denied' });

    await pool.query('DELETE FROM entry_comments WHERE id = $1', [commentId]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
