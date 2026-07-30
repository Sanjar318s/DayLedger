const express = require('express');
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const { checkAchievements } = require('../services/achievements');

const router = express.Router();

// Исправить достижения: удалить старые и вставить правильные (UTF-8)
router.get('/fix-achievements', async (req, res) => {
  try {
    // Удаляем все старые достижения (каскадно удалятся user_achievements)
    await pool.query('DELETE FROM achievements');

    const achievements = [
      { chain: 'notes', threshold: 1, name: 'Первая заметка', description: 'Создайте первую запись', points: 5 },
      { chain: 'notes', threshold: 5, name: '5 заметок', description: 'Создайте 5 записей', points: 10 },
      { chain: 'notes', threshold: 10, name: '10 заметок', description: 'Создайте 10 записей', points: 15 },
      { chain: 'notes', threshold: 25, name: '25 заметок', description: 'Создайте 25 записей', points: 25 },
      { chain: 'notes', threshold: 50, name: '50 заметок', description: 'Создайте 50 записей', points: 50 },
      { chain: 'notes', threshold: 100, name: '100 заметок', description: 'Создайте 100 записей', points: 100 },
      { chain: 'done', threshold: 1, name: 'Первое выполнение', description: 'Выполните первую заметку', points: 5 },
      { chain: 'done', threshold: 5, name: 'Планировщик', description: 'Выполните 5 заметок', points: 10 },
      { chain: 'done', threshold: 10, name: 'Мастер дел', description: 'Выполните 10 заметок', points: 20 },
      { chain: 'friends', threshold: 1, name: 'Первый друг', description: 'Добавьте первого друга', points: 5 },
      { chain: 'friends', threshold: 3, name: '3 друга', description: 'Добавьте 3 друзей', points: 10 },
      { chain: 'friends', threshold: 10, name: '10 друзей', description: 'Добавьте 10 друзей', points: 25 },
      { chain: 'messages', threshold: 1, name: 'Первое сообщение', description: 'Отправьте первое сообщение другу', points: 5 },
      { chain: 'messages', threshold: 10, name: 'Общительный', description: 'Отправьте 10 сообщений', points: 10 },
      { chain: 'messages', threshold: 50, name: 'Болтун', description: 'Отправьте 50 сообщений', points: 25 },
    ];

    for (const a of achievements) {
      await pool.query(
        'INSERT INTO achievements (id, chain, threshold, name, description, points) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv4(), a.chain, a.threshold, a.name, a.description, a.points]
      );
    }

    // Пересчитать достижения для всех пользователей
    const users = await pool.query('SELECT id FROM users');
    for (const user of users.rows) {
      await checkAchievements(user.id);
    }

    res.json({ message: 'Достижения исправлены и пересчитаны' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;