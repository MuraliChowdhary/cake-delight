ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);