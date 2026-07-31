const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const passport = require('passport');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, public_id: user.public_id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

async function generateUniquePublicId() {
  let id;
  let exists = true;
  while (exists) {
    id = String(Math.floor(10000 + Math.random() * 90000));
    const res = await pool.query('SELECT 1 FROM users WHERE public_id = $1', [id]);
    exists = res.rows.length > 0;
  }
  return id;
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  try {
    const publicId = await generateUniquePublicId();
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, public_id, nickname) VALUES ($1, $2, $3, $4) RETURNING id, email, timezone, language, currency, public_id, nickname, avatar_url',
      [email, hashed, publicId, name || null]
    );
    const user = result.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.json({ accessToken, user });
  } catch (err) {
    if (err.code === '23505') res.status(409).json({ error: 'Email already exists' });
    else res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (await bcrypt.compare(password, user.password_hash)) {
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      res.cookie('refreshToken', refreshToken, cookieOptions);
      res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          timezone: user.timezone,
          language: user.language || 'ru',
          currency: user.currency || 'UZS',
          public_id: user.public_id,
          nickname: user.nickname || null,
          avatar_url: user.avatar_url || null,
        },
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'Refresh token missing' });
  jwt.verify(token, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid refresh token' });
    const userRes = await pool.query(
      'SELECT id, email, timezone, language, currency, public_id, nickname, avatar_url FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userRes.rows.length === 0) return res.status(403).json({ error: 'User not found' });
    const user = userRes.rows[0];
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.json({ accessToken });
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, timezone, language, currency, public_id, nickname, avatar_url FROM users WHERE id = $1',
    [req.user.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

router.patch('/profile', authenticateToken, async (req, res) => {
  const { timezone, language, currency, nickname, avatar_url } = req.body;
  const updates = [];
  const values = [];
  let counter = 1;
  if (timezone !== undefined) { updates.push(`timezone = $${counter++}`); values.push(timezone); }
  if (language !== undefined) { updates.push(`language = $${counter++}`); values.push(language); }
  if (currency !== undefined) { updates.push(`currency = $${counter++}`); values.push(currency); }
  if (nickname !== undefined) { updates.push(`nickname = $${counter++}`); values.push(nickname); }
  if (avatar_url !== undefined) { updates.push(`avatar_url = $${counter++}`); values.push(avatar_url); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.user.id);
  try {
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${counter} RETURNING id, email, timezone, language, currency, public_id, nickname, avatar_url`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new password required' });
  try {
    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(oldPassword, userRes.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid old password' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ------------------- Google OAuth -------------------
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login` }),
  (req, res) => {
    const user = req.user;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.redirect(`${process.env.CLIENT_URL}/?accessToken=${accessToken}`);
  }
);
// ---------------------------------------------------

module.exports = router;