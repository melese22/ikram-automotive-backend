CREATE TABLE IF NOT EXISTS tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_token ON tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tracking_job_card ON tracking_tokens(job_card_id);