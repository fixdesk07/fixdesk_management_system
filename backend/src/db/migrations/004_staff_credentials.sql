-- Migration: 004_staff_credentials.sql
-- Add username support to users & staff, and update credentials

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;

-- Reset and re-seed clean users table
DELETE FROM users;

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

-- Update usernames in staff table
UPDATE staff SET username = 'alex' WHERE name = 'Alex Carter';
UPDATE staff SET username = 'david' WHERE name = 'David Miller';
UPDATE staff SET username = 'sam' WHERE name = 'Sam Wilson';
UPDATE staff SET username = 'marcus' WHERE name ILIKE '%Marcus%';
UPDATE staff SET username = 'priya' WHERE name = 'Priya Patel';
UPDATE staff SET username = 'elena' WHERE name = 'Elena Gomez';
