-- Migration: 003_auth_users.sql
-- FixDesk Authentication & User Accounts

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Technician', 'Receptionist', 'Manager')),
  phone          VARCHAR(50),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial authenticated users
INSERT INTO users (name, email, password_hash, role, phone)
VALUES
  ('Admin Administrator', 'admin@fixdesk.com', '$2b$10$CHf0oocgiGmp4.McZwTq.upBK6FFVKJpABOucRADOinUJFPGEfdhS', 'Admin', '+91 98765 00001'),
  ('Alex Carter', 'alex@fixdesk.com', '$2b$10$k1ohPMDxZ7ASAefYvLrNSOtAQkKZP93c5VToGnYL0A0VsxZRzEnu.', 'Technician', '+91 98765 00002'),
  ('David Miller', 'david@fixdesk.com', '$2b$10$k1ohPMDxZ7ASAefYvLrNSOtAQkKZP93c5VToGnYL0A0VsxZRzEnu.', 'Technician', '+91 98765 00003'),
  ('Sam Wilson', 'sam@fixdesk.com', '$2b$10$k1ohPMDxZ7ASAefYvLrNSOtAQkKZP93c5VToGnYL0A0VsxZRzEnu.', 'Technician', '+91 98765 00004'),
  ('Priya Patel', 'priya@fixdesk.com', '$2b$10$dY5WyqxOtOXsnLJANIrbR.IzbSBAiVDJZKJPoB6w7/ptnLP6Jm8JW', 'Receptionist', '+91 98765 00005')
ON CONFLICT (email) DO NOTHING;
