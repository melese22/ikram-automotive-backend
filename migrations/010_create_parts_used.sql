CREATE TABLE IF NOT EXISTS parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts_inventory(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_at_use DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parts_used_job_card ON parts_used(job_card_id);
CREATE INDEX IF NOT EXISTS idx_parts_used_part ON parts_used(part_id);