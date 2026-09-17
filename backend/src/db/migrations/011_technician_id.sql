-- Migration: 011_technician_id.sql
-- Phase 2: Add technician_id FK to service_jobs, alongside existing technician TEXT column.
-- Safe incremental migration — both columns coexist until a future cleanup phase.

-- Add nullable technician_id FK column (references staff, not users)
ALTER TABLE service_jobs
  ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Backfill: match existing technician TEXT to staff.id by name
-- Uses case-insensitive match; unmatched records are left NULL (safe)
UPDATE service_jobs sj
SET technician_id = s.id
FROM staff s
WHERE LOWER(s.name) = LOWER(sj.technician)
  AND sj.technician IS NOT NULL
  AND sj.technician_id IS NULL;

-- Index for fast technician-based job lookups
CREATE INDEX IF NOT EXISTS idx_service_jobs_technician_id
  ON service_jobs(technician_id);

-- Note: The technician TEXT column is NOT dropped here.
-- It remains as a fallback for unmatched records and backward compatibility.
-- A future Phase 3 migration will drop it after all records are verified.
