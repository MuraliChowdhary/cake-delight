CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ratings(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment VARCHAR(255),
    user_id UUID NOT NULL,
    cake_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_cake_rating UNIQUE (user_id, cake_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_cake_id ON ratings(cake_id);
CREATE INDEX IF NOT EXISTS idx_ratings_score ON ratings(score);

INSERT INTO ratings(score, comment, user_id, cake_id)
VALUES
    (5, 'Extremely delicious cake', '5e81f5f3-4a63-4b47-975a-8b1b22591234', 'fb1a0c0a-9740-484f-bcd7-cdc9a123c63e'),
    (2, 'Not bad', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'dc46de87-b7c0-4657-b68c-5102f7307fd4'),
    (3, 'Good', 'f81d4fae-7dec-41d0-a765-00a0c91e6bf6', '476d41df-2434-4e4f-ba3e-48a37d9ec46e'),
    (4, 'Enjoyed', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'c845b7b7-441e-4623-a619-30067731ae12'),
    (1, 'Its fine', 'f81d4fae-7dec-41d0-a765-00a0c91e6bf6', '6fe1ef5e-b015-4624-a286-4382d1f14ed9')
ON CONFLICT DO NOTHING;