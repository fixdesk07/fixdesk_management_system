-- Migration: 006_invoice_discounts.sql
-- Add custom discount support to invoices

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
