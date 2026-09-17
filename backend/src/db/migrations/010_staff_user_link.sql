-- Migration: 010_staff_user_link.sql
-- Phase 2: Establish explicit FK between staff and users tables.
-- Replaces fragile username-string matching with a proper relational link.

-- Add user_id FK column to staff table
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Backfill: link existing staff records to their users record by username match
UPDATE staff s
SET user_id = u.id
FROM users u
WHERE LOWER(u.username) = LOWER(s.username)
  AND s.user_id IS NULL;

-- Create index for FK lookups
CREATE INDEX IF NOT EXISTS idx_staff_user_id
  ON staff(user_id);

-- Add UNIQUE constraint to enforce one-to-one relationship (one user = one staff record)
-- Only add if no duplicate user_id values exist (NULL is excluded from uniqueness)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_user_id_unique'
    AND conrelid = 'staff'::regclass
  ) THEN
    IF NOT EXISTS (
      SELECT user_id FROM staff
      WHERE user_id IS NOT NULL
      GROUP BY user_id HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE staff ADD CONSTRAINT staff_user_id_unique UNIQUE (user_id);
    ELSE
      RAISE NOTICE 'Skipping staff.user_id UNIQUE constraint — duplicate user_id values found.';
    END IF;
  END IF;
END $$;
