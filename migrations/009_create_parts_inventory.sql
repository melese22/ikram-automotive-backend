CREATE TABLE IF NOT EXISTS parts_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  supplier VARCHAR(255),
  min_stock INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workshop_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_parts_workshop ON parts_inventory(workshop_id);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts_inventory(category);
CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_parts_low_stock ON parts_inventory(workshop_id) WHERE quantity <= min_stock;