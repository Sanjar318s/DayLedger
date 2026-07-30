-- Добавляем поля для цепочек
ALTER TABLE achievements ADD COLUMN chain TEXT;
ALTER TABLE achievements ADD COLUMN threshold INT;

-- Очищаем старые достижения (пересоздадим с правильной логикой)
DELETE FROM achievements;

-- Вставляем цепочки достижений (название цепочки, порог, название, описание, XP)
INSERT INTO achievements (id, chain, threshold, name, description, points) VALUES
  -- Заметки
  (uuid_generate_v4(), 'notes', 1, 'Первая заметка', 'Создайте первую запись', 5),
  (uuid_generate_v4(), 'notes', 5, '5 заметок', 'Создайте 5 записей', 10),
  (uuid_generate_v4(), 'notes', 10, '10 заметок', 'Создайте 10 записей', 15),
  (uuid_generate_v4(), 'notes', 25, '25 заметок', 'Создайте 25 записей', 25),
  (uuid_generate_v4(), 'notes', 50, '50 заметок', 'Создайте 50 записей', 50),
  (uuid_generate_v4(), 'notes', 100, '100 заметок', 'Создайте 100 записей', 100),
  -- Друзья
  (uuid_generate_v4(), 'friends', 1, 'Первый друг', 'Добавьте первого друга', 5),
  (uuid_generate_v4(), 'friends', 3, '3 друга', 'Добавьте 3 друзей', 10),
  (uuid_generate_v4(), 'friends', 10, '10 друзей', 'Добавьте 10 друзей', 25),
  -- Выполненные заметки
  (uuid_generate_v4(), 'done', 1, 'Первое выполнение', 'Выполните первую заметку', 5),
  (uuid_generate_v4(), 'done', 5, 'Планировщик', 'Выполните 5 заметок', 10),
  (uuid_generate_v4(), 'done', 10, 'Мастер дел', 'Выполните 10 заметок', 20),
  -- Сообщения
  (uuid_generate_v4(), 'messages', 1, 'Первое сообщение', 'Отправьте первое сообщение другу', 5),
  (uuid_generate_v4(), 'messages', 10, 'Общительный', 'Отправьте 10 сообщений', 10),
  (uuid_generate_v4(), 'messages', 50, 'Болтун', 'Отправьте 50 сообщений', 25);
