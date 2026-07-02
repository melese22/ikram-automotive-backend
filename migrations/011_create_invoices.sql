DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL,
  job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE RESTRICT,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  issued_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workshop_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_job_card ON invoices(job_card_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workshop ON invoices(workshop_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);