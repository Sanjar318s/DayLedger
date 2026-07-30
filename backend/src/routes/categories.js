const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authenticateToken);

// Получить все категории текущего пользователя
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM categories WHERE user_id = $1 ORDER BY name',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Создать категорию
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO categories (id, user_id, name) VALUES ($1, $2, $3)',
      [id, req.user.id, name.trim()]
    );
    const result = await pool.query('SELECT id, name FROM categories WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') res.status(409).json({ error: 'Category already exists' });
    else res.status(500).json({ error: 'Server error' });
  }
});

// Удалить категорию
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
