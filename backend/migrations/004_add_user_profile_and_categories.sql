ALTER TABLE users
  ADD COLUMN nickname TEXT,
  ADD COLUMN avatar_url TEXT,
  ADD COLUMN public_id TEXT UNIQUE;

-- Заполним существующим пользователям случайные 5-значные public_id
UPDATE users SET public_id = lpad(floor(random() * 100000)::text, 5, '0') WHERE public_id IS NULL;

-- Таблица пользовательских категорий
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Добавим category_id в entries
ALTER TABLE entries ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
