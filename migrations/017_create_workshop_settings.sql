CREATE TABLE IF NOT EXISTS workshop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE UNIQUE,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'ETB',
  business_hours JSONB DEFAULT '{"mon":"08:00-17:00","tue":"08:00-17:00","wed":"08:00-17:00","thu":"08:00-17:00","fri":"08:00-17:00","sat":"08:00-12:00","sun":"closed"}',
  logo_url TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  timezone VARCHAR(50) DEFAULT 'Africa/Addis_Ababa',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
