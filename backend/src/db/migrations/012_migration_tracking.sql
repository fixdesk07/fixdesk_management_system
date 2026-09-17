-- Migration: 012_migration_tracking.sql
-- Phase 2: Create schema_migrations tracking table so the migration runner
-- knows which migrations have already been applied and skips them.
-- This migration intentionally has no "IF NOT EXISTS" guard on the INSERT —
-- the migrate.js runner inserts its own filename only once.

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Record all previously applied migrations so they are not re-run.
-- These filenames must match exactly what is on disk.
INSERT INTO schema_migrations (filename) VALUES
  ('001_init.sql'),
  ('002_staff.sql'),
  ('003_auth_users.sql'),
  ('004_staff_credentials.sql'),
  ('005_invoice_items.sql'),
  ('006_invoice_discounts.sql'),
  ('007_job_code.sql'),
  ('008_device_catalog.sql'),
  ('009_data_integrity.sql'),
  ('010_staff_user_link.sql'),
  ('011_technician_id.sql'),
  ('012_migration_tracking.sql')
ON CONFLICT (filename) DO NOTHING;
