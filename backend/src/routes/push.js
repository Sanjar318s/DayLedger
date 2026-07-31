const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { getVapidPublicKey } = require('../services/pushNotifications');

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(500).json({ error: 'VAPID keys not configured' });
  res.json({ publicKey: key });
});

router.use(authenticateToken);

router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    await pool.query(
      'INSERT INTO push_subscriptions (user_id, endpoint, keys) VALUES ($1, $2, $3)',
      [req.user.id, endpoint, JSON.stringify(keys)]
    );
    res.status(201).json({ message: 'Subscribed' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
