const webPush = require('web-push');
const pool = require('../db');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:admin@dayledger.com', vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('VAPID keys not configured — push notifications disabled');
}

function vapidConfigured() {
  return Boolean(vapidPublicKey && vapidPrivateKey);
}

async function sendPushNotification(userId, payload) {
  if (!vapidConfigured()) return;
  try {
    const subs = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
    for (const sub of subs.rows) {
      let keys;
      try {
        keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
      } catch {
        continue;
      }
      if (!keys || !keys.p256dh || !keys.auth) continue;
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys },
          JSON.stringify(payload)
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        } else {
          console.error('Push failed:', err.statusCode, err.body || err.message);
        }
      }
    }
  } catch (err) {
    console.error('Push error:', err);
  }
}

module.exports = { sendPushNotification, getVapidPublicKey: () => vapidPublicKey };
