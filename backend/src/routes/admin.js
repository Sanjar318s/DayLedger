const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const ADMIN_PUBLIC_ID = '99999';

async function requireAdmin(req, res, next) {
  try {
    const result = await pool.query('SELECT public_id FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (result.rows[0].public_id !== ADMIN_PUBLIC_ID) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, public_id, nickname, avatar_url, language, currency, timezone, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id/public-id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { public_id } = req.body;

  if (!public_id || typeof public_id !== 'string') {
    return res.status(400).json({ error: 'public_id is required' });
  }

  if (public_id.length < 3 || public_id.length > 20) {
    return res.status(400).json({ error: 'public_id must be 3-20 characters' });
  }

  const existing = await pool.query('SELECT 1 FROM users WHERE public_id = $1 AND id != $2', [public_id, id]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'public_id already exists' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET public_id = $1 WHERE id = $2 RETURNING id, email, public_id, nickname',
      [public_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id/password', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'New password is required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = await pool.query('SELECT 1 FROM users WHERE id = $1', [id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, id]);
    res.json({ message: 'Password reset', password });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;