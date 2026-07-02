CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  file_key VARCHAR(500) NOT NULL,
  thumbnail_key VARCHAR(500),
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'image',
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_job_card ON media_assets(job_card_id);
CREATE INDEX IF NOT EXISTS idx_media_tags ON media_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_category ON media_assets(category);