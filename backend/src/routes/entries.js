const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { notifyUser } = require('../socket');
const { v4: uuidv4 } = require('uuid');
const { checkAchievements } = require('../services/achievements');

const router = express.Router();
router.use(authenticateToken);

// Получить запись по ID (свою или общую) – должен идти ДО общего GET /
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const entry = await pool.query('SELECT * FROM entries WHERE id = $1', [id]);
    if (entry.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });

    const entryData = entry.rows[0];

    // Если владелец – отдаём сразу
    if (entryData.user_id === req.user.id) {
      return res.json(entryData);
    }

    // Проверяем доступ через шаринг
    const share = await pool.query(
      'SELECT * FROM entry_shares WHERE entry_id = $1 AND friend_id = $2 AND accepted = TRUE',
      [id, req.user.id]
    );
    if (share.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });

    res.json({ ...entryData, permission: share.rows[0].permission });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Список записей за период (только свои)
router.get('/', async (req, res) => {
  const { from, to, category_id } = req.query;
  let query = 'SELECT * FROM entries WHERE user_id = $1';
  const params = [req.user.id];
  if (from) { params.push(from); query += ` AND event_at >= $${params.length}`; }
  if (to) { params.push(to); query += ` AND event_at <= $${params.length}`; }
  if (category_id) {
    params.push(category_id);
    query += ` AND category_id = $${params.length}`;
  }
  query += ' ORDER BY event_at';
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { title, description, event_at, remind_before_minutes, amount, amount_type, category, category_id, currency } = req.body;
  const id = uuidv4();

  let entryCurrency = currency;
  if (!entryCurrency) {
    const userRes = await pool.query('SELECT currency FROM users WHERE id = $1', [req.user.id]);
    entryCurrency = userRes.rows[0]?.currency || 'UZS';
  }

  if (category_id) {
    const cat = await pool.query('SELECT 1 FROM categories WHERE id = $1 AND user_id = $2', [category_id, req.user.id]);
    if (cat.rows.length === 0) return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    await pool.query(
      `INSERT INTO entries (id, user_id, title, description, event_at, remind_before_minutes, amount, amount_type, category, category_id, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, req.user.id, title, description || '', event_at, remind_before_minutes || 0, amount || null, amount_type || null, category || null, category_id || null, entryCurrency]
    );
    if (amount) {
      await pool.query(
        `INSERT INTO transactions (user_id, amount, type, category, occurred_at, note, entry_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.user.id, amount, amount_type || 'expense', category || null, event_at, title, id]
      );
    }
    const entry = await pool.query('SELECT * FROM entries WHERE id = $1', [id]);
    await checkAchievements(req.user.id);
    res.status(201).json(entry.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { category_id, ...rest } = req.body;

  try {
    const entry = await pool.query('SELECT * FROM entries WHERE id = $1', [id]);
    if (entry.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });

    const entryData = entry.rows[0];
    let canEdit = entryData.user_id === req.user.id;

    if (!canEdit) {
      const share = await pool.query(
        'SELECT 1 FROM entry_shares WHERE entry_id = $1 AND friend_id = $2 AND accepted = TRUE AND permission = $3',
        [id, req.user.id, 'edit']
      );
      canEdit = share.rows.length > 0;
    }

    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    const allowedFields = ['title', 'description', 'event_at', 'remind_before_minutes', 'amount', 'amount_type', 'category', 'currency', 'is_done', 'notified'];
    const fields = [];
    const values = [];
    let counter = 1;

    for (const [key, val] of Object.entries(rest)) {
      if (!allowedFields.includes(key)) continue;
      fields.push(`${key} = $${counter}`);
      values.push(val);
      counter++;
    }

    if (category_id !== undefined) {
      if (category_id !== null) {
        const cat = await pool.query('SELECT 1 FROM categories WHERE id = $1 AND user_id = $2', [category_id, req.user.id]);
        if (cat.rows.length === 0) return res.status(400).json({ error: 'Invalid category' });
      }
      fields.push(`category_id = $${counter}`);
      values.push(category_id);
      counter++;
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    const idParam = counter;

    const result = await pool.query(
      `UPDATE entries SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${idParam}
       RETURNING *`,
      values
    );

    if (entryData.user_id !== req.user.id) {
      notifyUser(entryData.user_id, 'entry_updated', { entry: result.rows[0] });
    }
    const shares = await pool.query('SELECT friend_id FROM entry_shares WHERE entry_id = $1 AND accepted = TRUE AND friend_id != $2', [id, req.user.id]);
    shares.rows.forEach(r => notifyUser(r.friend_id, 'entry_updated', { entry: result.rows[0] }));

    await checkAchievements(req.user.id);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM entries WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавить текст в описание записи (только для редакторов)
router.patch('/:id/append', async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });

  try {
    // Проверяем, что запись существует
    const entry = await pool.query('SELECT * FROM entries WHERE id = $1', [id]);
    if (entry.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });

    const entryData = entry.rows[0];

    // Владелец всегда может редактировать
    let canEdit = entryData.user_id === req.user.id;

    // Проверяем, есть ли у друга право edit через шаринг
    if (!canEdit) {
      const share = await pool.query(
        'SELECT 1 FROM entry_shares WHERE entry_id = $1 AND friend_id = $2 AND accepted = TRUE AND permission = $3',
        [id, req.user.id, 'edit']
      );
      canEdit = share.rows.length > 0;
    }

    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    // Добавляем текст в описание
    const currentDescription = entryData.description || '';
    const newDescription = currentDescription
      ? currentDescription + '\n' + text.trim()
      : text.trim();

    const updated = await pool.query(
      'UPDATE entries SET description = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [newDescription, id]
    );

    // Уведомим владельца (если добавлял не он)
    if (entryData.user_id !== req.user.id) {
      notifyUser(entryData.user_id, 'entry_updated', { entry: updated.rows[0] });
    }

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
