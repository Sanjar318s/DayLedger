CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points INT DEFAULT 10
);

CREATE TABLE user_achievements (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Начальные достижения
INSERT INTO achievements (id, name, description, points) VALUES
  (uuid_generate_v4(), 'Первая заметка', 'Создайте первую запись', 5),
  (uuid_generate_v4(), '10 заметок', 'Создайте 10 записей', 10),
  (uuid_generate_v4(), 'Первый друг', 'Добавьте первого друга', 5),
  (uuid_generate_v4(), 'Планировщик', 'Выполните 5 заметок', 10);
