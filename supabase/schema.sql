-- ─────────────────────────────────────────────────────────────────────────────
-- FixDesk — Complete Consolidated Supabase Database Schema & Logic
-- Apply this script in your Supabase SQL Editor (https://app.supabase.com)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SCHEMAS & SEQUENCES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS job_code_seq START WITH 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CORE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       VARCHAR(100) UNIQUE NOT NULL,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Technician', 'Receptionist', 'Manager')),
  phone          VARCHAR(50),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STAFF TABLE
CREATE TABLE IF NOT EXISTS staff (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  username       VARCHAR(100) UNIQUE,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(255),
  phone          VARCHAR(50) NOT NULL,
  role           VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Technician', 'Receptionist', 'Manager')),
  specialization VARCHAR(150),
  status         VARCHAR(30) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Leave')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  phone       TEXT         NOT NULL,
  email       TEXT,
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- PARTS / INVENTORY TABLE
CREATE TABLE IF NOT EXISTS parts (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT          NOT NULL,
  part_number       TEXT          NOT NULL UNIQUE,
  compatible_models TEXT,
  quantity          INTEGER       NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity      INTEGER       NOT NULL DEFAULT 0,
  purchase_price    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  supplier          TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- SERVICE JOBS TABLE
CREATE TABLE IF NOT EXISTS service_jobs (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number          INTEGER,
  job_code            TEXT          UNIQUE,
  customer_id         UUID          REFERENCES customers(id) ON DELETE SET NULL,
  device_type         TEXT          NOT NULL,
  device_brand        TEXT,
  device_model        TEXT,
  serial_number       TEXT,
  problem_description TEXT,
  status              TEXT          NOT NULL DEFAULT 'Received'
                      CHECK (status IN (
                        'Received', 'Diagnosis', 'Waiting for Approval', 'Approved',
                        'Repairing', 'Quality Check', 'Ready for Pickup', 'Completed',
                        'Waiting for Parts', 'Unrepairable', 'Cancelled'
                      )),
  technician          TEXT,
  technician_id       UUID          REFERENCES staff(id) ON DELETE SET NULL,
  estimated_cost      NUMERIC(10,2),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- JOB PARTS TABLE (many-to-many: jobs <-> parts)
CREATE TABLE IF NOT EXISTS job_parts (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID          NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
  part_id        UUID          REFERENCES parts(id) ON DELETE SET NULL,
  quantity_used  INTEGER       NOT NULL DEFAULT 1 CHECK (quantity_used >= 1),
  unit_price     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0)
);

-- INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID          REFERENCES service_jobs(id) ON DELETE SET NULL,
  customer_id     UUID          REFERENCES customers(id) ON DELETE SET NULL,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_type   TEXT          NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_rate >= 0),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status          TEXT          NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Paid', 'Cancelled')),
  issued_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  paid_at         TIMESTAMPTZ
);

-- INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS invoice_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  part_id      UUID          REFERENCES parts(id) ON DELETE SET NULL,
  description  TEXT          NOT NULL,
  quantity     INTEGER       NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_price  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  is_part      BOOLEAN       NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- INVENTORY MOVEMENTS AUDIT TRAIL TABLE
CREATE TABLE IF NOT EXISTS inventory_movements (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id        UUID          NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  quantity       INTEGER       NOT NULL,
  movement_type  TEXT          NOT NULL CHECK (movement_type IN (
                   'PURCHASE', 'ADJUSTMENT', 'JOB_USAGE',
                   'JOB_USAGE_REVERSAL', 'INVOICE_SALE', 'INVOICE_REVERSAL'
                 )),
  reference_type TEXT          CHECK (reference_type IN ('job', 'invoice', 'manual')),
  reference_id   UUID,
  notes          TEXT,
  created_by     UUID          REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- DEVICE CATALOG TABLES
CREATE TABLE IF NOT EXISTS device_types (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_brands (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  device_type TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(name, device_type)
);

CREATE TABLE IF NOT EXISTS device_models (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT         NOT NULL,
  brand       TEXT         NOT NULL,
  device_type TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(name, brand, device_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_service_jobs_customer_id ON service_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_jobs_status ON service_jobs(status);
CREATE INDEX IF NOT EXISTS idx_service_jobs_technician_id ON service_jobs(technician_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_job_parts_job_id ON job_parts(job_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_part_id ON inventory_movements(part_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SEED INITIAL DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed Users
INSERT INTO users (username, name, email, password_hash, role, phone)
VALUES
  ('admin', 'Admin Administrator', 'admin@fixdesk.com', '$2b$10$yMmKXjyJNtVLKGhEAFiaCeprRasrOztJevAPHBiNGm1XmP11z4a0K', 'Admin', '+91 98765 00001'),
  ('alex', 'Alex Carter', 'alex@fixdesk.com', '$2b$10$Y5Q6i8nnsimfiP1KDnc8TezNAO50UStZUPURVi/FJD9P8Mw88Y2yW', 'Technician', '+91 98765 00002'),
  ('david', 'David Miller', 'david@fixdesk.com', '$2b$10$fzdKf22dN4dxYFYTtTdcXeVmJ5beKZeoNTZUFWYxBE73LkWg49neS', 'Technician', '+91 98765 00003'),
  ('sam', 'Sam Wilson', 'sam@fixdesk.com', '$2b$10$dkmNJyZ.EViMv8YtusbdRup/bvC2CQKnhE89u63A1HnwfJu3wr0ee', 'Technician', '+91 98765 00004'),
  ('marcus', 'Marcus Vance', 'marcus@fixdesk.com', '$2b$10$uJPtDI64wY1LuNlX1ThQKuBgzvXaaGdueIZUOrbbjYwVEvkv.DKuS', 'Technician', '+91 98765 00006'),
  ('priya', 'Priya Patel', 'priya@fixdesk.com', '$2b$10$geDuJ6xnjBAddDRql4G82egj/edwpf5LeoRWNAyreELV5TlfdS.yK', 'Receptionist', '+91 98765 00005'),
  ('elena', 'Elena Gomez', 'elena@fixdesk.com', '$2b$10$X.1Ppo5U4oDSTowBThWWju7j5/TWrJZpVTSIS5706wwp47ODpjE/S', 'Receptionist', '+91 98765 00007')
ON CONFLICT (username) DO NOTHING;

-- Seed Staff
INSERT INTO staff (username, name, email, phone, role, specialization, status)
VALUES
  ('alex', 'Alex Carter', 'alex@fixdesk.com', '+91 98765 00002', 'Technician', 'Chip-Level & Laptop Hardware', 'Active'),
  ('david', 'David Miller', 'david@fixdesk.com', '+91 98765 00003', 'Technician', 'Smartphone Screens & Micro-soldering', 'Active'),
  ('sam', 'Sam Wilson', 'sam@fixdesk.com', '+91 98765 00004', 'Technician', 'Desktop PC & Liquid Cooling', 'Active'),
  ('priya', 'Priya Patel', 'priya@fixdesk.com', '+91 98765 00005', 'Receptionist', 'Customer Intake & Front Desk', 'Active'),
  ('marcus', 'Marcus Vance', 'marcus@fixdesk.com', '+91 98765 00006', 'Technician', 'Apple Mac & iPhone Specialist', 'Active'),
  ('elena', 'Elena Gomez', 'elena@fixdesk.com', '+91 98765 00007', 'Receptionist', 'Billing & Customer Support', 'Active')
ON CONFLICT (username) DO NOTHING;

-- Link staff to user_id
UPDATE staff s SET user_id = u.id FROM users u WHERE LOWER(u.username) = LOWER(s.username) AND s.user_id IS NULL;

-- Seed Initial Device Types
INSERT INTO device_types (name, description) VALUES
  ('Laptop', 'Portable notebook computers, ultrabooks, gaming laptops'),
  ('Computer', 'Desktop PCs, custom rigs, all-in-one workstations, servers'),
  ('Mobile', 'Smartphones, feature phones, cellular devices'),
  ('Tablet', 'iPads, Android tablets, drawing pads'),
  ('Smartwatch', 'Wearables, smart fitness bands, Apple Watch'),
  ('Gaming Console', 'PlayStation, Xbox, Nintendo Switch, handheld consoles')
ON CONFLICT (name) DO NOTHING;

-- Seed Brands
INSERT INTO device_brands (name, device_type) VALUES
  ('Apple', 'Laptop'), ('Dell', 'Laptop'), ('HP', 'Laptop'), ('Lenovo', 'Laptop'),
  ('ASUS', 'Laptop'), ('Acer', 'Laptop'), ('MSI', 'Laptop'), ('Samsung', 'Laptop'),
  ('Custom Built', 'Computer'), ('Dell', 'Computer'), ('HP', 'Computer'), ('Lenovo', 'Computer'),
  ('Apple (Mac)', 'Computer'), ('ASUS', 'Computer'), ('Acer', 'Computer'),
  ('Apple (iPhone)', 'Mobile'), ('Samsung', 'Mobile'), ('Xiaomi / Redmi', 'Mobile'), ('OnePlus', 'Mobile'),
  ('Vivo', 'Mobile'), ('Oppo', 'Mobile'), ('Realme', 'Mobile'), ('Google (Pixel)', 'Mobile'),
  ('Apple (iPad)', 'Tablet'), ('Samsung Galaxy Tab', 'Tablet'), ('Lenovo Tab', 'Tablet'),
  ('Apple Watch', 'Smartwatch'), ('Samsung Galaxy Watch', 'Smartwatch'),
  ('Sony PlayStation', 'Gaming Console'), ('Microsoft Xbox', 'Gaming Console'), ('Nintendo', 'Gaming Console')
ON CONFLICT (name, device_type) DO NOTHING;

-- Seed Top Models
INSERT INTO device_models (name, brand, device_type) VALUES
  ('iPhone 15 Pro Max', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 15 Pro', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 15', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 14 Pro Max', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 14', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 13', 'Apple (iPhone)', 'Mobile'),
  ('Galaxy S24 Ultra', 'Samsung', 'Mobile'),
  ('Galaxy S24+', 'Samsung', 'Mobile'),
  ('Galaxy S23 Ultra', 'Samsung', 'Mobile'),
  ('OnePlus 12', 'OnePlus', 'Mobile'),
  ('XPS 15 (9530)', 'Dell', 'Laptop'),
  ('Inspiron 15 (3520)', 'Dell', 'Laptop'),
  ('Pavilion 15', 'HP', 'Laptop'),
  ('Victus 16', 'HP', 'Laptop'),
  ('ThinkPad X1 Carbon Gen 11', 'Lenovo', 'Laptop'),
  ('IdeaPad Slim 3', 'Lenovo', 'Laptop'),
  ('ROG Zephyrus G14', 'ASUS', 'Laptop'),
  ('MacBook Pro 16" (M3/M2/M1)', 'Apple', 'Laptop'),
  ('MacBook Air 13" (M3/M2/M1)', 'Apple', 'Laptop'),
  ('PlayStation 5 (Disc Edition)', 'Sony PlayStation', 'Gaming Console'),
  ('Xbox Series X', 'Microsoft Xbox', 'Gaming Console'),
  ('Nintendo Switch OLED', 'Nintendo', 'Gaming Console')
ON CONFLICT (name, brand, device_type) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC STORED PROCEDURES (Atomic Transactions)
-- ─────────────────────────────────────────────────────────────────────────────

-- Function: Atomic Job Creation with Sequence Generation
CREATE OR REPLACE FUNCTION create_job_with_code(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_customer_address TEXT,
  p_customer_notes TEXT,
  p_device_type TEXT,
  p_device_brand TEXT,
  p_device_model TEXT,
  p_serial_number TEXT,
  p_problem_description TEXT,
  p_technician TEXT,
  p_technician_id UUID,
  p_estimated_cost NUMERIC,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id UUID := p_customer_id;
  v_job_id UUID := gen_random_uuid();
  v_job_num INTEGER;
  v_job_code TEXT;
  v_status TEXT := COALESCE(p_status, 'Received');
  v_result JSONB;
BEGIN
  -- 1. Create customer if not provided
  IF v_customer_id IS NULL AND p_customer_name IS NOT NULL AND p_customer_phone IS NOT NULL THEN
    INSERT INTO customers (id, name, phone, email, address, notes)
    VALUES (gen_random_uuid(), TRIM(p_customer_name), TRIM(p_customer_phone),
            NULLIF(TRIM(p_customer_email), ''), NULLIF(TRIM(p_customer_address), ''), NULLIF(TRIM(p_customer_notes), ''))
    RETURNING id INTO v_customer_id;
  END IF;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer ID or valid customer details (name, phone) are required';
  END IF;

  -- 2. Generate sequential job_code
  SELECT nextval('job_code_seq') INTO v_job_num;
  v_job_code := 'JOB-' || LPAD(v_job_num::text, 4, '0');

  -- 3. Insert Job
  INSERT INTO service_jobs (
    id, job_number, job_code, customer_id, device_type, device_brand, device_model,
    serial_number, problem_description, status, technician, technician_id, estimated_cost
  ) VALUES (
    v_job_id, v_job_num, v_job_code, v_customer_id, TRIM(p_device_type), TRIM(p_device_brand), TRIM(p_device_model),
    TRIM(p_serial_number), NULLIF(TRIM(p_problem_description), ''), v_status,
    p_technician, p_technician_id, p_estimated_cost
  );

  -- 4. Return complete job record
  SELECT row_to_json(t)::jsonb INTO v_result
  FROM (
    SELECT j.*,
           c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           s.name AS technician_name, s.id AS technician_staff_id
    FROM service_jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN staff s ON j.technician_id = s.id
    WHERE j.id = v_job_id
  ) t;

  RETURN v_result;
END;
$$;

-- Function: Add Part to Job with Atomic Stock Deduction
CREATE OR REPLACE FUNCTION add_job_part_with_stock(
  p_job_id UUID,
  p_part_id UUID,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_part_name TEXT;
  v_stock_available INTEGER;
  v_jp_id UUID := gen_random_uuid();
  v_result JSONB;
BEGIN
  -- Verify job exists
  IF NOT EXISTS (SELECT 1 FROM service_jobs WHERE id = p_job_id) THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Verify part stock
  SELECT name, quantity INTO v_part_name, v_stock_available FROM parts WHERE id = p_part_id FOR UPDATE;
  IF v_part_name IS NULL THEN
    RAISE EXCEPTION 'Part % not found', p_part_id;
  END IF;

  IF v_stock_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %', v_part_name, v_stock_available, p_quantity;
  END IF;

  -- Deduct stock
  UPDATE parts SET quantity = quantity - p_quantity WHERE id = p_part_id;

  -- Insert job_parts record
  INSERT INTO job_parts (id, job_id, part_id, quantity_used, unit_price)
  VALUES (v_jp_id, p_job_id, p_part_id, p_quantity, p_unit_price);

  -- Record audit movement
  INSERT INTO inventory_movements (id, part_id, quantity, movement_type, reference_type, reference_id, notes, created_by)
  VALUES (gen_random_uuid(), p_part_id, -p_quantity, 'JOB_USAGE', 'job', p_job_id, 'Attached to job', p_created_by);

  SELECT row_to_json(t)::jsonb INTO v_result
  FROM (
    SELECT jp.id, jp.job_id, jp.part_id, jp.quantity_used, jp.unit_price, p.name AS part_name, p.part_number
    FROM job_parts jp
    LEFT JOIN parts p ON jp.part_id = p.id
    WHERE jp.id = v_jp_id
  ) t;

  RETURN v_result;
END;
$$;

-- Function: Remove Part from Job with Stock Restoration
CREATE OR REPLACE FUNCTION remove_job_part_with_stock(
  p_jp_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id UUID;
  v_part_id UUID;
  v_qty INTEGER;
BEGIN
  DELETE FROM job_parts WHERE id = p_jp_id RETURNING job_id, part_id, quantity_used INTO v_job_id, v_part_id, v_qty;

  IF v_part_id IS NOT NULL AND v_qty > 0 THEN
    UPDATE parts SET quantity = quantity + v_qty WHERE id = v_part_id;

    INSERT INTO inventory_movements (id, part_id, quantity, movement_type, reference_type, reference_id, notes, created_by)
    VALUES (gen_random_uuid(), v_part_id, v_qty, 'JOB_USAGE_REVERSAL', 'job', v_job_id, 'Part removed from job', p_created_by);
  END IF;
END;
$$;

-- Function: Delete Job with Stock Restoration
CREATE OR REPLACE FUNCTION delete_job_with_stock_restoration(
  p_job_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT part_id, quantity_used FROM job_parts WHERE job_id = p_job_id LOOP
    IF r.part_id IS NOT NULL THEN
      UPDATE parts SET quantity = quantity + r.quantity_used WHERE id = r.part_id;

      INSERT INTO inventory_movements (id, part_id, quantity, movement_type, reference_type, reference_id, notes, created_by)
      VALUES (gen_random_uuid(), r.part_id, r.quantity_used, 'JOB_USAGE_REVERSAL', 'job', p_job_id, 'Job deleted - stock restored', p_created_by);
    END IF;
  END LOOP;

  DELETE FROM service_jobs WHERE id = p_job_id;
END;
$$;

-- Function: Atomic Invoice Creation
CREATE OR REPLACE FUNCTION create_invoice_transaction(
  p_job_id UUID,
  p_customer_id UUID,
  p_labor_cost NUMERIC,
  p_items JSONB,
  p_tax_rate NUMERIC,
  p_discount_type TEXT,
  p_discount_value NUMERIC,
  p_status TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id UUID := p_customer_id;
  v_inv_id UUID := gen_random_uuid();
  v_subtotal NUMERIC := 0;
  v_tax_rate NUMERIC := GREATEST(0, COALESCE(p_tax_rate, 0));
  v_tax_amount NUMERIC := 0;
  v_disc_type TEXT := CASE WHEN p_discount_type = 'percentage' THEN 'percentage' ELSE 'fixed' END;
  v_disc_rate NUMERIC := 0;
  v_disc_amount NUMERIC := 0;
  v_grand_total NUMERIC := 0;
  v_status TEXT := CASE WHEN p_status = 'Paid' THEN 'Paid' ELSE 'Unpaid' END;
  v_item RECORD;
  v_part RECORD;
  v_job RECORD;
  v_jp RECORD;
  v_line_total NUMERIC;
  v_result JSONB;
BEGIN
  -- 1. Source Job details
  IF p_job_id IS NOT NULL THEN
    SELECT * INTO v_job FROM service_jobs WHERE id = p_job_id;
    IF v_job.id IS NULL THEN
      RAISE EXCEPTION 'Selected service job % not found', p_job_id;
    END IF;
    v_customer_id := v_job.customer_id;

    -- Add labor line item if cost specified
    IF p_labor_cost > 0 THEN
      INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price, is_part)
      VALUES (gen_random_uuid(), v_inv_id, 'Repair Service & Labor (' || COALESCE(v_job.device_brand, '') || ' ' || COALESCE(v_job.device_model, v_job.device_type) || ')', 1, p_labor_cost, p_labor_cost, false);
      v_subtotal := v_subtotal + p_labor_cost;
    END IF;

    -- Add attached job parts
    FOR v_jp IN
      SELECT jp.*, p.name AS part_name, p.part_number
      FROM job_parts jp LEFT JOIN parts p ON jp.part_id = p.id WHERE jp.job_id = p_job_id
    LOOP
      v_line_total := v_jp.quantity_used * v_jp.unit_price;
      INSERT INTO invoice_items (id, invoice_id, part_id, description, quantity, unit_price, total_price, is_part)
      VALUES (gen_random_uuid(), v_inv_id, v_jp.part_id, COALESCE(v_jp.part_name, 'Spare Part') || ' (' || COALESCE(v_jp.part_number, 'P-ITEM') || ')', v_jp.quantity_used, v_jp.unit_price, v_line_total, true);
      v_subtotal := v_subtotal + v_line_total;
    END LOOP;
  END IF;

  -- 2. Process direct line items
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (part_id UUID, description TEXT, quantity INT, unit_price NUMERIC) LOOP
      v_line_total := v_item.quantity * v_item.unit_price;
      INSERT INTO invoice_items (id, invoice_id, part_id, description, quantity, unit_price, total_price, is_part)
      VALUES (gen_random_uuid(), v_inv_id, v_item.part_id, COALESCE(v_item.description, 'Service / Part item'), v_item.quantity, v_item.unit_price, v_line_total, (v_item.part_id IS NOT NULL));
      v_subtotal := v_subtotal + v_line_total;

      -- If direct part sale, validate & deduct stock
      IF v_item.part_id IS NOT NULL THEN
        SELECT name, quantity INTO v_part FROM parts WHERE id = v_item.part_id FOR UPDATE;
        IF v_part.quantity < v_item.quantity THEN
          RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %', v_part.name, v_part.quantity, v_item.quantity;
        END IF;

        UPDATE parts SET quantity = quantity - v_item.quantity WHERE id = v_item.part_id;

        INSERT INTO inventory_movements (id, part_id, quantity, movement_type, reference_type, reference_id, notes, created_by)
        VALUES (gen_random_uuid(), v_item.part_id, -v_item.quantity, 'INVOICE_SALE', 'invoice', v_inv_id, 'Direct counter sale', p_created_by);
      END IF;
    END LOOP;
  ELSIF p_job_id IS NULL AND p_labor_cost > 0 THEN
    INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price, is_part)
    VALUES (gen_random_uuid(), v_inv_id, 'Service / Diagnostic Labor Fee', 1, p_labor_cost, p_labor_cost, false);
    v_subtotal := v_subtotal + p_labor_cost;
  END IF;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer ID is required for invoice creation';
  END IF;

  -- 3. Calculate tax & discounts
  v_tax_amount := (v_subtotal * v_tax_rate) / 100;
  IF v_disc_type = 'percentage' THEN
    v_disc_rate := LEAST(100, GREATEST(0, COALESCE(p_discount_value, 0)));
    v_disc_amount := ((v_subtotal + v_tax_amount) * v_disc_rate) / 100;
  ELSE
    v_disc_amount := LEAST(v_subtotal + v_tax_amount, GREATEST(0, COALESCE(p_discount_value, 0)));
    v_disc_rate := CASE WHEN (v_subtotal + v_tax_amount) > 0 THEN (v_disc_amount / (v_subtotal + v_tax_amount)) * 100 ELSE 0 END;
  END IF;

  v_grand_total := GREATEST(0, (v_subtotal + v_tax_amount) - v_disc_amount);

  -- 4. Create Invoice
  INSERT INTO invoices (
    id, job_id, customer_id, subtotal, discount_type, discount_rate,
    discount_amount, tax_rate, tax_amount, total, status, paid_at
  ) VALUES (
    v_inv_id, p_job_id, v_customer_id, v_subtotal, v_disc_type, v_disc_rate,
    v_disc_amount, v_tax_rate, v_tax_amount, v_grand_total, v_status,
    CASE WHEN v_status = 'Paid' THEN now() ELSE NULL END
  );

  -- 5. Return complete invoice
  SELECT row_to_json(t)::jsonb INTO v_result
  FROM (
    SELECT i.*,
           c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           j.job_code, j.device_type, j.device_model, j.device_brand, j.serial_number
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN service_jobs j ON i.job_id = j.id
    WHERE i.id = v_inv_id
  ) t;

  RETURN v_result;
END;
$$;

-- Function: Cancel Invoice with Idempotent Stock Reversal
CREATE OR REPLACE FUNCTION cancel_invoice_transaction(
  p_invoice_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
  v_item RECORD;
BEGIN
  SELECT status INTO v_status FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  IF v_status != 'Cancelled' THEN
    UPDATE invoices SET status = 'Cancelled' WHERE id = p_invoice_id;

    -- Check if already reversed
    IF NOT EXISTS (SELECT 1 FROM inventory_movements WHERE reference_type = 'invoice' AND reference_id = p_invoice_id AND movement_type = 'INVOICE_REVERSAL') THEN
      FOR v_item IN SELECT part_id, quantity FROM invoice_items WHERE invoice_id = p_invoice_id AND is_part = true AND part_id IS NOT NULL LOOP
        UPDATE parts SET quantity = quantity + v_item.quantity WHERE id = v_item.part_id;

        INSERT INTO inventory_movements (id, part_id, quantity, movement_type, reference_type, reference_id, notes, created_by)
        VALUES (gen_random_uuid(), v_item.part_id, v_item.quantity, 'INVOICE_REVERSAL', 'invoice', p_invoice_id, 'Invoice cancelled - stock restored', p_user_id);
      END LOOP;
    END IF;
  END IF;
END;
$$;

-- Function: Delete Invoice with Stock Restoration
CREATE OR REPLACE FUNCTION delete_invoice_with_stock_restoration(
  p_invoice_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cancel_invoice_transaction(p_invoice_id, p_user_id);
  DELETE FROM invoices WHERE id = p_invoice_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PERMISSIVE POLICIES FOR SUPABASE CLIENT (ANON / AUTH)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_models ENABLE ROW LEVEL SECURITY;

-- Allow full access to anon key for FixDesk app
CREATE POLICY "Public full access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to parts" ON parts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to service_jobs" ON service_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to job_parts" ON job_parts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to inventory_movements" ON inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to device_types" ON device_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to device_brands" ON device_brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to device_models" ON device_models FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for live UI synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE service_jobs, invoices, parts, customers;
