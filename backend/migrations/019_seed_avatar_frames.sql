ALTER TABLE avatar_frames ADD CONSTRAINT avatar_frames_name_unique UNIQUE (name);

INSERT INTO avatar_frames (name, description, required_achievements, css_style) VALUES
  ('Серая', 'Базовая рамка', 0, 'border: 3px solid #9e9e9e; box-shadow: 0 0 12px rgba(158,158,158,0.7);'),
  ('Зелёная', '3 достижения', 3, 'border: 3px solid #4caf50; box-shadow: 0 0 12px rgba(76,175,80,0.8);'),
  ('Синяя', '8 достижений', 8, 'border: 3px solid #2196f3; box-shadow: 0 0 12px rgba(33,150,243,0.8);'),
  ('Фиолетовая', '15 достижений', 15, 'border: 3px solid #9c27b0; box-shadow: 0 0 15px rgba(156,39,176,0.9);'),
  ('Золотая', '20 достижений', 20, 'border: 3px solid #ffd700; box-shadow: 0 0 20px rgba(255,215,0,1);')
ON CONFLICT (name) DO NOTHING;
