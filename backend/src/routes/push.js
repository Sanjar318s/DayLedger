const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  try {
    await pool.query(
      'INSERT INTO push_subscriptions (user_id, endpoint, keys) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [req.user.id, endpoint, JSON.stringify(keys)]
    );
    res.status(201).json({ message: 'Subscribed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
