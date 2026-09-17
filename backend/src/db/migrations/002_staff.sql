-- Migration: 002_staff.sql
-- FixDesk Staff Management Schema

CREATE TABLE IF NOT EXISTS staff (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Preload default team if empty
INSERT INTO staff (name, email, phone, role, specialization, status)
SELECT * FROM (VALUES
  ('Alex Carter', 'alex@fixdesk.com', '+91 98765 00002', 'Technician', 'Chip-Level & Laptop Hardware', 'Active'),
  ('David Miller', 'david@fixdesk.com', '+91 98765 00003', 'Technician', 'Smartphone Screens & Micro-soldering', 'Active'),
  ('Sam Wilson', 'sam@fixdesk.com', '+91 98765 00004', 'Technician', 'Desktop PC & Liquid Cooling', 'Active'),
  ('Priya Patel', 'priya@fixdesk.com', '+91 98765 00005', 'Receptionist', 'Customer Intake & Front Desk', 'Active'),
  ('Marcus Vance', 'marcus@fixdesk.com', '+91 98765 00006', 'Technician', 'Apple Mac & iPhone Specialist', 'Active'),
  ('Elena Gomez', 'elena@fixdesk.com', '+91 98765 00007', 'Receptionist', 'Billing & Customer Support', 'Active')
) AS v(name, email, phone, role, specialization, status)
WHERE NOT EXISTS (SELECT 1 FROM staff);
