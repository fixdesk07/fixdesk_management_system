-- Add sequential job_number and job_code ('JOB-0001', 'JOB-0002', etc.)
CREATE SEQUENCE IF NOT EXISTS job_code_seq START WITH 1;

ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS job_number INTEGER;
ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS job_code TEXT;

-- Number existing jobs chronologically
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM service_jobs
)
UPDATE service_jobs
SET job_number = numbered.rn,
    job_code = 'JOB-' || LPAD(numbered.rn::text, 4, '0')
FROM numbered
WHERE service_jobs.id = numbered.id;

-- Ensure sequence starts after existing max
SELECT setval('job_code_seq', GREATEST((SELECT COALESCE(MAX(job_number), 0) + 1 FROM service_jobs), 1), false);
