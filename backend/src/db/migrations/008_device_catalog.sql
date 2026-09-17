-- ─────────────────────────────────────────
--  DEVICE CATALOG (Types, Brands, Models)
-- ─────────────────────────────────────────

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

-- Seed Initial Device Types
INSERT INTO device_types (name, description) VALUES
  ('Laptop', 'Portable notebook computers, ultrabooks, gaming laptops'),
  ('Computer', 'Desktop PCs, custom rigs, all-in-one workstations, servers'),
  ('Mobile', 'Smartphones, feature phones, cellular devices'),
  ('Tablet', 'iPads, Android tablets, drawing pads'),
  ('Smartwatch', 'Wearables, smart fitness bands, Apple Watch'),
  ('Gaming Console', 'PlayStation, Xbox, Nintendo Switch, handheld consoles')
ON CONFLICT (name) DO NOTHING;

-- Seed Initial Brands
INSERT INTO device_brands (name, device_type) VALUES
  -- Laptops
  ('Apple', 'Laptop'), ('Dell', 'Laptop'), ('HP', 'Laptop'), ('Lenovo', 'Laptop'),
  ('ASUS', 'Laptop'), ('Acer', 'Laptop'), ('MSI', 'Laptop'), ('Samsung', 'Laptop'),
  ('LG', 'Laptop'), ('Microsoft Surface', 'Laptop'), ('Razer', 'Laptop'), ('Toshiba', 'Laptop'),
  ('Sony VAIO', 'Laptop'), ('Huawei', 'Laptop'), ('Alienware', 'Laptop'), ('Gigabyte', 'Laptop'),
  -- Computers
  ('Custom Built', 'Computer'), ('Dell', 'Computer'), ('HP', 'Computer'), ('Lenovo', 'Computer'),
  ('Apple (Mac)', 'Computer'), ('ASUS', 'Computer'), ('Acer', 'Computer'), ('MSI', 'Computer'),
  ('Corsair', 'Computer'), ('Intel NUC', 'Computer'), ('Gigabyte', 'Computer'), ('Alienware', 'Computer'),
  -- Mobile
  ('Apple (iPhone)', 'Mobile'), ('Samsung', 'Mobile'), ('Xiaomi / Redmi', 'Mobile'), ('OnePlus', 'Mobile'),
  ('Vivo', 'Mobile'), ('Oppo', 'Mobile'), ('Realme', 'Mobile'), ('Google (Pixel)', 'Mobile'),
  ('Motorola', 'Mobile'), ('Nothing', 'Mobile'), ('POCO', 'Mobile'), ('Infinix', 'Mobile'),
  ('Tecno', 'Mobile'), ('Honor', 'Mobile'), ('Nokia', 'Mobile'), ('IQOO', 'Mobile'),
  ('Sony Xperia', 'Mobile'), ('Asus ROG', 'Mobile'),
  -- Tablets
  ('Apple (iPad)', 'Tablet'), ('Samsung Galaxy Tab', 'Tablet'), ('Lenovo Tab', 'Tablet'),
  ('Xiaomi Pad', 'Tablet'), ('Realme Pad', 'Tablet'), ('Microsoft Surface Pro', 'Tablet'),
  -- Smartwatches
  ('Apple Watch', 'Smartwatch'), ('Samsung Galaxy Watch', 'Smartwatch'), ('Fossil', 'Smartwatch'),
  ('Garmin', 'Smartwatch'), ('Noise', 'Smartwatch'), ('Boat', 'Smartwatch'), ('Fire-Boltt', 'Smartwatch'),
  -- Gaming Consoles
  ('Sony PlayStation', 'Gaming Console'), ('Microsoft Xbox', 'Gaming Console'),
  ('Nintendo', 'Gaming Console'), ('Steam Deck', 'Gaming Console'), ('ASUS ROG Ally', 'Gaming Console')
ON CONFLICT (name, device_type) DO NOTHING;

-- Seed Initial Models (Sample Top Models)
INSERT INTO device_models (name, brand, device_type) VALUES
  -- iPhone
  ('iPhone 15 Pro Max', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 15 Pro', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 15', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 14 Pro Max', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 14 Pro', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 14', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 13 Pro Max', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 13', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 12', 'Apple (iPhone)', 'Mobile'),
  ('iPhone 11', 'Apple (iPhone)', 'Mobile'),
  -- Samsung Mobile
  ('Galaxy S24 Ultra', 'Samsung', 'Mobile'),
  ('Galaxy S24+', 'Samsung', 'Mobile'),
  ('Galaxy S24', 'Samsung', 'Mobile'),
  ('Galaxy S23 Ultra', 'Samsung', 'Mobile'),
  ('Galaxy S23', 'Samsung', 'Mobile'),
  ('Galaxy Z Fold 5', 'Samsung', 'Mobile'),
  ('Galaxy Z Flip 5', 'Samsung', 'Mobile'),
  ('Galaxy A54 5G', 'Samsung', 'Mobile'),
  -- OnePlus
  ('OnePlus 12', 'OnePlus', 'Mobile'),
  ('OnePlus 12R', 'OnePlus', 'Mobile'),
  ('OnePlus 11 5G', 'OnePlus', 'Mobile'),
  ('OnePlus Nord CE 4', 'OnePlus', 'Mobile'),
  -- Dell Laptops
  ('XPS 15 (9530)', 'Dell', 'Laptop'),
  ('XPS 13 Plus', 'Dell', 'Laptop'),
  ('Inspiron 15 (3520)', 'Dell', 'Laptop'),
  ('Latitude 5430', 'Dell', 'Laptop'),
  ('G15 Gaming (5530)', 'Dell', 'Laptop'),
  -- HP Laptops
  ('Pavilion 15', 'HP', 'Laptop'),
  ('Pavilion x360 14', 'HP', 'Laptop'),
  ('Victus 16', 'HP', 'Laptop'),
  ('OMEN 16', 'HP', 'Laptop'),
  ('Spectre x360 14', 'HP', 'Laptop'),
  ('HP 15s', 'HP', 'Laptop'),
  -- Lenovo Laptops
  ('ThinkPad X1 Carbon Gen 11', 'Lenovo', 'Laptop'),
  ('ThinkPad T14 Gen 4', 'Lenovo', 'Laptop'),
  ('IdeaPad Slim 3', 'Lenovo', 'Laptop'),
  ('IdeaPad Gaming 3', 'Lenovo', 'Laptop'),
  ('Legion Pro 5i', 'Lenovo', 'Laptop'),
  -- ASUS Laptops
  ('ROG Zephyrus G14', 'ASUS', 'Laptop'),
  ('TUF Gaming A15', 'ASUS', 'Laptop'),
  ('ZenBook 14 OLED', 'ASUS', 'Laptop'),
  ('VivoBook 15', 'ASUS', 'Laptop'),
  -- Apple Laptops
  ('MacBook Pro 16" (M3/M2/M1)', 'Apple', 'Laptop'),
  ('MacBook Pro 14" (M3/M2/M1)', 'Apple', 'Laptop'),
  ('MacBook Air 15" (M3/M2)', 'Apple', 'Laptop'),
  ('MacBook Air 13" (M3/M2/M1)', 'Apple', 'Laptop'),
  -- Consoles
  ('PlayStation 5 (Disc Edition)', 'Sony PlayStation', 'Gaming Console'),
  ('PlayStation 5 Slim', 'Sony PlayStation', 'Gaming Console'),
  ('PlayStation 4 Pro', 'Sony PlayStation', 'Gaming Console'),
  ('Xbox Series X', 'Microsoft Xbox', 'Gaming Console'),
  ('Xbox Series S', 'Microsoft Xbox', 'Gaming Console'),
  ('Nintendo Switch OLED', 'Nintendo', 'Gaming Console')
ON CONFLICT (name, brand, device_type) DO NOTHING;
