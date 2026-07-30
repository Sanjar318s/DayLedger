CREATE TABLE avatar_frames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  required_achievements INT NOT NULL DEFAULT 0,
  css_style TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_frames (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  frame_id UUID NOT NULL REFERENCES avatar_frames(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, frame_id)
);

ALTER TABLE users ADD COLUMN active_frame_id UUID REFERENCES avatar_frames(id) ON DELETE SET NULL;
