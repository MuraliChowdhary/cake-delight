CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE notification_status AS ENUM ('sent', 'failed');

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE,        
  order_id UUID NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  status notification_status NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);