-- Migration: 009_data_integrity.sql
-- Phase 2: Database-level integrity constraints and inventory audit trail.
-- Uses DO blocks for idempotent constraint creation (compatible with PG 12+).

-- ─────────────────────────────────────────
-- 1. parts — non-negative quantity and prices
-- ─────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE parts ADD CONSTRAINT parts_quantity_non_negative CHECK (quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE parts ADD CONSTRAINT parts_selling_price_non_negative CHECK (selling_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE parts ADD CONSTRAINT parts_purchase_price_non_negative CHECK (purchase_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- 2. job_parts — positive quantities
-- ─────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE job_parts ADD CONSTRAINT job_parts_quantity_positive CHECK (quantity_used >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE job_parts ADD CONSTRAINT job_parts_unit_price_non_negative CHECK (unit_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- 3. invoice_items — positive quantities
-- ─────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_quantity_positive CHECK (quantity >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_unit_price_non_negative CHECK (unit_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_total_price_non_negative CHECK (total_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- 4. invoices — financial amounts non-negative
-- ─────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_subtotal_non_negative CHECK (subtotal >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_total_non_negative CHECK (total >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_tax_amount_non_negative CHECK (tax_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_discount_amount_non_negative CHECK (discount_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- 5. service_jobs — unique job codes and numbers
-- Only added if no duplicates exist (safe for fresh and existing installs).
-- ─────────────────────────────────────────
DO $$
DECLARE dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT job_code FROM service_jobs
    WHERE job_code IS NOT NULL
    GROUP BY job_code HAVING COUNT(*) > 1
  ) t;

  IF dup_count = 0 THEN
    BEGIN
      ALTER TABLE service_jobs ADD CONSTRAINT service_jobs_job_code_unique UNIQUE (job_code);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  ELSE
    RAISE NOTICE 'Skipping job_code UNIQUE constraint — % duplicate group(s) found.', dup_count;
  END IF;
END $$;

DO $$
DECLARE dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT job_number FROM service_jobs
    WHERE job_number IS NOT NULL
    GROUP BY job_number HAVING COUNT(*) > 1
  ) t;

  IF dup_count = 0 THEN
    BEGIN
      ALTER TABLE service_jobs ADD CONSTRAINT service_jobs_job_number_unique UNIQUE (job_number);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  ELSE
    RAISE NOTICE 'Skipping job_number UNIQUE constraint — % duplicate group(s) found.', dup_count;
  END IF;
END $$;

-- ─────────────────────────────────────────
-- 6. Inventory movements audit table
-- Records every stock change for accurate reversal tracking and idempotency.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id        UUID          NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  quantity       INTEGER       NOT NULL,
  movement_type  TEXT          NOT NULL
                 CHECK (movement_type IN (
                   'PURCHASE',
                   'ADJUSTMENT',
                   'JOB_USAGE',
                   'JOB_USAGE_REVERSAL',
                   'INVOICE_SALE',
                   'INVOICE_REVERSAL'
                 )),
  reference_type TEXT          CHECK (reference_type IN ('job', 'invoice', 'manual')),
  reference_id   UUID,
  notes          TEXT,
  created_by     UUID          REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_part_id
  ON inventory_movements(part_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference
  ON inventory_movements(reference_type, reference_id);

-- ─────────────────────────────────────────
-- 7. Performance indexes
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_jobs_customer_id ON service_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_jobs_status ON service_jobs(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_job_parts_job_id ON job_parts(job_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_users_lower_username ON users(LOWER(username));
