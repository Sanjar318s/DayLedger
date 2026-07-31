const cron = require('node-cron');
const pool = require('../db');
const { sendPushNotification } = require('./pushNotifications');

async function checkReminders() {
  try {
    const now = new Date().toISOString();
    const result = await pool.query(
      `SELECT e.*, u.id as uid FROM entries e JOIN users u ON e.user_id = u.id
       WHERE e.notified = false AND (e.event_at - (e.remind_before_minutes || 0) * interval '1 minute') <= $1`,
      [now]
    );
    for (const entry of result.rows) {
      // send push
      const time = new Date(entry.event_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      await sendPushNotification(entry.user_id, {
        title: 'Напоминание',
        body: `${entry.title} в ${time}`,
        url: '/',
        tag: 'reminder',
      });
      await pool.query('UPDATE entries SET notified = true WHERE id = $1', [entry.id]);
    }
  } catch (err) {
    console.error('Scheduler error:', err);
  }
}

function startScheduler() {
  cron.schedule('* * * * *', checkReminders); // каждую минуту
  console.log('Reminder scheduler started');
}

module.exports = { startScheduler };
