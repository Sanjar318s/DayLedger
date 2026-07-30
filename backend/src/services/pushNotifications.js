const webPush = require('web-push');
const pool = require('../db');

webPush.setVapidDetails(
  'mailto:example@dayledger.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushNotification(userId, payload) {
  try {
    const subs = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
    for (const sub of subs.rows) {
      const keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys },
        JSON.stringify(payload)
      );
    }
  } catch (err) {
    console.error('Push failed:', err);
  }
}

module.exports = { sendPushNotification };
