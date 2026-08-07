CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS cakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  image_url VARCHAR(255),
  stock VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cakes_category ON cakes(category);
CREATE INDEX IF NOT EXISTS idx_cakes_price ON cakes(price);

-- Seed initial catalog data
INSERT INTO cakes (name, description, category, price, is_available, image_url)
VALUES
  ('Chocolate Fudge Cake', 'Rich double chocolate sponge with dark fudge icing', 'Chocolate', 24.99, true, '/images/chocolate-fudge.jpg'),
  ('Classic Red Velvet', 'Traditional red velvet with soft cream cheese frosting', 'Velvet', 28.50, true, '/images/red-velvet.jpg'),
  ('Strawberry Cheesecake', 'Baked New York style cheesecake with fresh strawberry topping', 'Cheesecake', 32.00, true, '/images/strawberry-cheesecake.jpg'),
  ('Vanilla Bean Delight', 'Light vanilla chiffon cake layered with fresh whipped cream', 'Vanilla', 21.00, true, '/images/vanilla-bean.jpg'),
  ('Lemon Raspberry Drizzle', 'Zesty lemon sponge with raspberry compote', 'Fruit', 26.00, false, '/images/lemon-raspberry.jpg')
ON CONFLICT DO NOTHING;