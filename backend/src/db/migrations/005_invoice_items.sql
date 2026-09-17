-- Migration: 005_invoice_items.sql
-- Itemized line items for invoices with inventory stock synchronization

CREATE TABLE IF NOT EXISTS invoice_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  part_id      UUID          REFERENCES parts(id) ON DELETE SET NULL,
  description  TEXT          NOT NULL,
  quantity     INTEGER       NOT NULL DEFAULT 1,
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_part      BOOLEAN       NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Backfill invoice_items for any existing invoices with jobs
INSERT INTO invoice_items (invoice_id, part_id, description, quantity, unit_price, total_price, is_part)
SELECT
  i.id,
  jp.part_id,
  COALESCE(p.name, 'Spare Part'),
  jp.quantity_used,
  jp.unit_price,
  (jp.quantity_used * jp.unit_price),
  true
FROM invoices i
JOIN job_parts jp ON i.job_id = jp.job_id
LEFT JOIN parts p ON jp.part_id = p.id
WHERE NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id AND ii.part_id = jp.part_id);
