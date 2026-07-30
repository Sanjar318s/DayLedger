const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  const { from, to, category } = req.query;
  let query = 'SELECT * FROM transactions WHERE user_id = $1';
  const params = [req.user.id];
  if (from) { params.push(from); query += ` AND occurred_at >= $${params.length}`; }
  if (to) { params.push(to); query += ` AND occurred_at <= $${params.length}`; }
  if (category) { params.push(category); query += ` AND category = $${params.length}`; }
  query += ' ORDER BY occurred_at DESC';
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { amount, type, category, occurred_at, note } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, amount, type, category, occurred_at, note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, amount, type, category, occurred_at || new Date().toISOString(), note]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
