CREATE TYPE job_status AS ENUM ('PENDING', 'DIAGNOSTIC', 'IN_PROGRESS', 'TEST_DRIVE', 'COMPLETED');

CREATE TABLE IF NOT EXISTS job_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description TEXT,
  status job_status NOT NULL DEFAULT 'PENDING',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_status_transition CHECK (
    status IN ('PENDING', 'DIAGNOSTIC', 'IN_PROGRESS', 'TEST_DRIVE', 'COMPLETED')
  )
);

CREATE INDEX IF NOT EXISTS idx_job_cards_vehicle ON job_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_assigned ON job_cards(assigned_to);
CREATE INDEX IF NOT EXISTS idx_job_cards_workshop ON job_cards(workshop_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_created_by ON job_cards(created_by);
