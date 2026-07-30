const pool = require('../db');

async function checkAchievements(userId) {
  try {
    // Подсчитываем текущие значения для цепочек
    const notesRes = await pool.query('SELECT COUNT(*) FROM entries WHERE user_id = $1', [userId]);
    const notesCount = parseInt(notesRes.rows[0].count, 10);

    const doneRes = await pool.query("SELECT COUNT(*) FROM entries WHERE user_id = $1 AND is_done = true", [userId]);
    const doneCount = parseInt(doneRes.rows[0].count, 10);

    const friendsRes = await pool.query(
      `SELECT COUNT(*) FROM friend_requests WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'accepted'`,
      [userId]
    );
    const friendsCount = parseInt(friendsRes.rows[0].count, 10);

    const messagesRes = await pool.query('SELECT COUNT(*) FROM messages WHERE sender_id = $1', [userId]);
    const messagesCount = parseInt(messagesRes.rows[0].count, 10);

    const stats = {
      notes: notesCount,
      done: doneCount,
      friends: friendsCount,
      messages: messagesCount,
    };

    // Получаем все достижения, сгруппированные по цепочкам
    const allAch = await pool.query('SELECT * FROM achievements ORDER BY chain, threshold ASC');
    const chains = {};
    for (const row of allAch.rows) {
      if (!chains[row.chain]) chains[row.chain] = [];
      chains[row.chain].push(row);
    }

    // Проверяем каждую цепочку
    for (const [chain, achievements] of Object.entries(chains)) {
      const currentValue = stats[chain] || 0;
      for (const ach of achievements) {
        if (currentValue >= ach.threshold) {
          await unlockAchievement(userId, ach.id);
        }
      }
    }

    // Пересчитываем уровень (1 уровень за 100 очков)
    await pool.query('UPDATE users SET level = FLOOR(points / 100) + 1 WHERE id = $1', [userId]);
  } catch (err) {
    console.error('checkAchievements error:', err);
  }
}

async function unlockAchievement(userId, achievementId) {
  const exists = await pool.query(
    'SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
    [userId, achievementId]
  );
  if (exists.rows.length > 0) return; // уже разблокировано

  // Получаем XP достижения
  const ach = await pool.query('SELECT points FROM achievements WHERE id = $1', [achievementId]);
  if (ach.rows.length === 0) return;

  await pool.query(
    'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
    [userId, achievementId]
  );
  await pool.query('UPDATE users SET points = points + $1 WHERE id = $2', [ach.rows[0].points, userId]);
}

module.exports = { checkAchievements };
