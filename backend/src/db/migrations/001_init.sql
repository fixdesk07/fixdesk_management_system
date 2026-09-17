-- FixDesk — Initial schema migration
-- Run with: npm run migrate (from backend/)
-- Safe to re-run: all statements use IF NOT EXISTS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
--  CUSTOMERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  phone       TEXT         NOT NULL,
  email       TEXT,                        -- optional
  address     TEXT,                        -- optional
  notes       TEXT,                        -- optional
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
--  PARTS / INVENTORY
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT          NOT NULL,
  part_number       TEXT          NOT NULL UNIQUE,
  compatible_models TEXT,                      -- optional
  quantity          INTEGER       NOT NULL DEFAULT 0,
  min_quantity      INTEGER       NOT NULL DEFAULT 0,
  purchase_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  supplier          TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
--  SERVICE JOBS
--  Status enum — "Customer Input" is intentionally excluded.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_jobs (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID          REFERENCES customers(id) ON DELETE SET NULL,
  device_type         TEXT          NOT NULL,
  device_brand        TEXT,
  device_model        TEXT,
  serial_number       TEXT,
  problem_description TEXT,
  status              TEXT          NOT NULL DEFAULT 'Received'
                      CHECK (status IN (
                        'Received',
                        'Diagnosis',
                        'Waiting for Approval',
                        'Approved',
                        'Repairing',
                        'Quality Check',
                        'Ready for Pickup',
                        'Completed',
                        'Waiting for Parts',
                        'Unrepairable',
                        'Cancelled'
                      )),
  technician          TEXT,
  estimated_cost      NUMERIC(10,2),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
--  JOB PARTS  (many-to-many: jobs ↔ parts)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_parts (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID          NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
  part_id        UUID          REFERENCES parts(id) ON DELETE SET NULL,
  quantity_used  INTEGER       NOT NULL DEFAULT 1,
  unit_price     NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────
--  INVOICES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID          REFERENCES service_jobs(id) ON DELETE SET NULL,
  customer_id  UUID          REFERENCES customers(id) ON DELETE SET NULL,
  subtotal     NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate     NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total        NUMERIC(10,2) NOT NULL DEFAULT 0,
  status       TEXT          NOT NULL DEFAULT 'Unpaid'
               CHECK (status IN ('Unpaid','Paid','Cancelled')),
  issued_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  paid_at      TIMESTAMPTZ
);
