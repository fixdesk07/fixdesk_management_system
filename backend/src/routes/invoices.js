const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const {
  authenticateToken,
  requireRoles,
  CAN_MANAGE_INVOICES,
  ADMIN_ONLY,
} = require('../middleware/auth');

// All invoice routes require authentication.
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers (all require an active pg client inside a BEGIN block)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atomic stock deduction — uses a single UPDATE ... WHERE quantity >= requested.
 * Returns the updated part row. Throws a 409 error if stock is insufficient.
 */
async function deductStock(client, partId, qty) {
  const { rows, rowCount } = await client.query(
    `UPDATE parts
       SET quantity = quantity - $1
     WHERE id = $2
       AND quantity >= $1
     RETURNING id, name, quantity`,
    [qty, partId]
  );

  if (rowCount === 0) {
    const { rows: partRows } = await client.query(
      'SELECT id, name, quantity FROM parts WHERE id = $1',
      [partId]
    );
    if (!partRows.length) {
      throw Object.assign(new Error(`Part ${partId} not found.`), { statusCode: 404 });
    }
    const p = partRows[0];
    throw Object.assign(
      new Error(`Insufficient stock for "${p.name}". Available: ${p.quantity}, requested: ${qty}.`),
      { statusCode: 409 }
    );
  }
  return rows[0];
}

/**
 * Record an inventory movement within an existing client transaction.
 */
async function recordMovement(client, { partId, quantity, movementType, referenceType, referenceId, notes, createdBy }) {
  await client.query(
    `INSERT INTO inventory_movements
       (id, part_id, quantity, movement_type, reference_type, reference_id, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [uuidv4(), partId, quantity, movementType, referenceType, referenceId, notes || null, createdBy || null]
  );
}

/**
 * Restore stock for an invoice, exactly once.
 * Checks inventory_movements for existing INVOICE_REVERSAL records for this invoice
 * to prevent double-reversal.
 *
 * @returns {number} count of reversals applied (0 = already reversed)
 */
async function restoreInvoiceStock(client, invoiceId, userId) {
  // Check if we've already reversed this invoice
  const { rows: existing } = await client.query(
    `SELECT id FROM inventory_movements
     WHERE reference_type = 'invoice'
       AND reference_id = $1
       AND movement_type = 'INVOICE_REVERSAL'
     LIMIT 1`,
    [invoiceId]
  );
  if (existing.length > 0) {
    // Already reversed — idempotent, do nothing
    return 0;
  }

  // Fetch invoice_items that are parts (is_part = true)
  const { rows: items } = await client.query(
    `SELECT ii.part_id, ii.quantity, ii.description
     FROM invoice_items ii
     WHERE ii.invoice_id = $1
       AND ii.is_part = true
       AND ii.part_id IS NOT NULL`,
    [invoiceId]
  );

  let reversalCount = 0;
  for (const item of items) {
    await client.query(
      'UPDATE parts SET quantity = quantity + $1 WHERE id = $2',
      [item.quantity, item.part_id]
    );
    await recordMovement(client, {
      partId: item.part_id,
      quantity: item.quantity,   // positive = stock returning
      movementType: 'INVOICE_REVERSAL',
      referenceType: 'invoice',
      referenceId: invoiceId,
      notes: `Invoice cancelled/deleted — stock restored`,
      createdBy: userId,
    });
    reversalCount++;
  }

  return reversalCount;
}

/**
 * Fetch full invoice details (used in multiple endpoints).
 */
async function fetchFullInvoice(invoiceId) {
  const { rows } = await pool.query(`
    SELECT i.*,
           c.name AS customer_name, c.phone AS customer_phone,
           c.email AS customer_email, c.address AS customer_address,
           j.job_code, j.device_type, j.device_model, j.device_brand,
           j.serial_number, j.problem_description, j.technician
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN service_jobs j ON i.job_id = j.id
    WHERE i.id = $1
  `, [invoiceId]);

  if (!rows.length) return null;

  const { rows: items } = await pool.query(`
    SELECT ii.*, p.part_number, p.name AS part_name
    FROM invoice_items ii
    LEFT JOIN parts p ON ii.part_id = p.id
    WHERE ii.invoice_id = $1
    ORDER BY ii.created_at ASC
  `, [invoiceId]);

  return { ...rows[0], items, parts: items.filter(it => it.is_part) };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireRoles(...CAN_MANAGE_INVOICES), async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT i.*,
             c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
             j.job_code, j.device_type, j.device_model, j.device_brand, j.serial_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN service_jobs j ON i.job_id = j.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        c.name ILIKE $${params.length} OR
        c.phone ILIKE $${params.length} OR
        j.job_code ILIKE $${params.length} OR
        j.device_model ILIKE $${params.length} OR
        j.serial_number ILIKE $${params.length} OR
        i.id::text ILIKE $${params.length}
      )`;
    }

    query += ' ORDER BY i.issued_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', requireRoles(...CAN_MANAGE_INVOICES), async (req, res, next) => {
  try {
    const invoice = await fetchFullInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invoices  — Fully transactional invoice creation
//
// Transaction sequence:
//   BEGIN
//   → validate job / customer
//   → build line items list
//   → validate ALL parts have sufficient stock (before deducting any)
//   → deduct stock for each part atomically
//   → INSERT invoice
//   → INSERT invoice_items
//   → record inventory_movements
//   COMMIT (or ROLLBACK on any failure)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireRoles(...CAN_MANAGE_INVOICES), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { job_id, customer_id, labor_cost, items = [], tax_rate, status } = req.body;
    let targetCustomerId = customer_id;
    const invId = uuidv4();
    const lineItemsToInsert = [];
    // Parts that need stock deduction: { partId, qty }
    const partsToDeduct = [];

    // ── Pre-transaction input validation ──
    if (Array.isArray(items)) {
      for (const item of items) {
        const qty = parseInt(item.quantity ?? 0, 10);
        if (!Number.isInteger(qty) || qty < 1) {
          return res.status(400).json({
            error: `Item quantity must be at least 1 (got ${item.quantity}) for: ${item.description || item.part_id || 'unknown item'}`
          });
        }
        if (parseFloat(item.unit_price ?? 0) < 0) {
          return res.status(400).json({
            error: `Item unit_price cannot be negative for: ${item.description || item.part_id}`
          });
        }
      }
    }
    if (parseFloat(labor_cost ?? 0) < 0) {
      return res.status(400).json({ error: 'labor_cost cannot be negative' });
    }

    await client.query('BEGIN');


    let totalSubtotal = 0;

    // ── 1. Source from Service Job ─────────────────────────────────────────
    if (job_id) {
      const { rows: jobRows } = await client.query('SELECT * FROM service_jobs WHERE id=$1', [job_id]);
      if (!jobRows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Selected service job not found' });
      }
      const job = jobRows[0];
      targetCustomerId = job.customer_id;

      const laborAmount = parseFloat(labor_cost !== undefined ? labor_cost : (job.estimated_cost || 0));
      if (laborAmount > 0) {
        lineItemsToInsert.push({
          id: uuidv4(),
          invoice_id: invId,
          part_id: null,
          description: `Repair Service & Labor (${job.device_brand || ''} ${job.device_model || job.device_type})`.trim(),
          quantity: 1,
          unit_price: laborAmount,
          total_price: laborAmount,
          is_part: false,
        });
        totalSubtotal += laborAmount;
      }

      // Fetch attached job parts
      const { rows: jobParts } = await client.query(`
        SELECT jp.*, p.name AS part_name, p.part_number
        FROM job_parts jp
        LEFT JOIN parts p ON jp.part_id = p.id
        WHERE jp.job_id = $1
      `, [job_id]);

      for (const jp of jobParts) {
        const qty = parseInt(jp.quantity_used || 1, 10);
        const price = parseFloat(jp.unit_price || 0);
        const lineTotal = qty * price;
        lineItemsToInsert.push({
          id: uuidv4(),
          invoice_id: invId,
          part_id: jp.part_id,
          description: `${jp.part_name || 'Spare Part'} (${jp.part_number || 'P-ITEM'})`,
          quantity: qty,
          unit_price: price,
          total_price: lineTotal,
          is_part: true,
        });
        totalSubtotal += lineTotal;
        // Note: Job parts already had stock deducted when attached to the job.
        // We do NOT deduct again here — invoice is a financial record of the job.
        // (Parts sold via a job flow: stock was taken at attach-time.)
      }
    }

    // ── 2. Direct line items (counter sales, additional items) ─────────────
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const qty = parseInt(item.quantity || 1, 10);
        if (qty < 1) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Item quantity must be at least 1: ${item.description || item.part_id}` });
        }
        const price = parseFloat(item.unit_price || 0);
        const lineTotal = qty * price;

        lineItemsToInsert.push({
          id: uuidv4(),
          invoice_id: invId,
          part_id: item.part_id || null,
          description: item.description || 'Service / Part item',
          quantity: qty,
          unit_price: price,
          total_price: lineTotal,
          is_part: !!item.part_id,
        });
        totalSubtotal += lineTotal;

        // Direct part sales (not from a job) → need stock deduction
        if (item.part_id) {
          partsToDeduct.push({ partId: item.part_id, qty });
        }
      }
    } else if (!job_id && parseFloat(labor_cost || 0) > 0) {
      const laborAmount = parseFloat(labor_cost || 0);
      lineItemsToInsert.push({
        id: uuidv4(),
        invoice_id: invId,
        part_id: null,
        description: 'Service / Diagnostic Labor Fee',
        quantity: 1,
        unit_price: laborAmount,
        total_price: laborAmount,
        is_part: false,
      });
      totalSubtotal += laborAmount;
    }

    if (!targetCustomerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Customer or Job is required' });
    }

    // ── 3. Validate ALL parts stock BEFORE deducting any ──────────────────
    // This prevents partial deduction: if Part B fails, Part A is not yet touched.
    for (const { partId, qty } of partsToDeduct) {
      const { rows: stockRows } = await client.query(
        'SELECT id, name, quantity FROM parts WHERE id = $1',
        [partId]
      );
      if (!stockRows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Part ${partId} not found.` });
      }
      const p = stockRows[0];
      if (p.quantity < qty) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Insufficient stock for "${p.name}". Available: ${p.quantity}, requested: ${qty}.`
        });
      }
    }

    // ── 4. Deduct stock atomically (all validated above) ──────────────────
    for (const { partId, qty } of partsToDeduct) {
      await deductStock(client, partId, qty);
    }

    // ── 5. Calculate totals ───────────────────────────────────────────────
    const { discount_type = 'fixed', discount_rate = 0, discount_amount = 0, discount_value } = req.body;
    let discType = discount_type === 'percentage' ? 'percentage' : 'fixed';
    const taxR = Math.max(0, parseFloat(tax_rate || 0));
    const taxAmount = (totalSubtotal * taxR) / 100;
    const subtotalWithTax = totalSubtotal + taxAmount;

    let discRate = 0;
    let discAmount = 0;

    if (discType === 'percentage') {
      discRate = Math.max(0, Math.min(100, parseFloat(discount_rate !== undefined ? discount_rate : (discount_value || 0))));
      discAmount = Math.min(subtotalWithTax, (subtotalWithTax * discRate) / 100);
    } else {
      discAmount = Math.max(0, Math.min(subtotalWithTax, parseFloat(discount_amount !== undefined ? discount_amount : (discount_value || 0))));
      discRate = subtotalWithTax > 0 ? (discAmount / subtotalWithTax) * 100 : 0;
    }

    const grandTotal = Math.max(0, subtotalWithTax - discAmount);
    const invStatus = status === 'Paid' ? 'Paid' : 'Unpaid';
    const paidAt = invStatus === 'Paid' ? 'now()' : 'NULL';

    // ── 6. Create Invoice Record ──────────────────────────────────────────
    await client.query(
      `INSERT INTO invoices
         (id, job_id, customer_id, subtotal, discount_type, discount_rate,
          discount_amount, tax_rate, tax_amount, total, status, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,${paidAt})`,
      [invId, job_id || null, targetCustomerId, totalSubtotal,
       discType, discRate, discAmount, taxR, taxAmount, grandTotal, invStatus]
    );

    // ── 7. Insert line items ──────────────────────────────────────────────
    for (const line of lineItemsToInsert) {
      await client.query(
        `INSERT INTO invoice_items
           (id, invoice_id, part_id, description, quantity, unit_price, total_price, is_part)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [line.id, line.invoice_id, line.part_id, line.description,
         line.quantity, line.unit_price, line.total_price, line.is_part]
      );
    }

    // ── 8. Record inventory movements for direct sales ────────────────────
    for (const { partId, qty } of partsToDeduct) {
      await recordMovement(client, {
        partId,
        quantity: -qty,
        movementType: 'INVOICE_SALE',
        referenceType: 'invoice',
        referenceId: invId,
        notes: 'Direct counter sale',
        createdBy: req.user.id,
      });
    }

    await client.query('COMMIT');

    const fullInvoice = await fetchFullInvoice(invId);
    res.status(201).json(fullInvoice);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/invoices/:id/pay  — Mark invoice as Paid
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/pay', requireRoles(...CAN_MANAGE_INVOICES), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE invoices SET status='Paid', paid_at=now()
       WHERE id=$1 AND status != 'Paid'
       RETURNING *`,
      [req.params.id]
    );

    if (!rows.length) {
      // Either not found or already paid — check which
      const { rows: check } = await client.query('SELECT id, status FROM invoices WHERE id=$1', [req.params.id]);
      await client.query('ROLLBACK');
      if (!check.length) return res.status(404).json({ error: 'Invoice not found' });
      if (check[0].status === 'Paid') return res.status(409).json({ error: 'Invoice is already marked as Paid' });
      return res.status(409).json({ error: `Cannot pay an invoice with status: ${check[0].status}` });
    }

    await client.query('COMMIT');
    const fullInvoice = await fetchFullInvoice(req.params.id);
    res.json(fullInvoice);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/invoices/:id/cancel  — Cancel invoice and restore stock (idempotent)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/cancel', requireRoles(...CAN_MANAGE_INVOICES), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: invoiceRows } = await client.query(
      'SELECT id, status FROM invoices WHERE id=$1 FOR UPDATE',
      [req.params.id]
    );
    if (!invoiceRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceRows[0];

    // Update status only if not already cancelled
    if (invoice.status !== 'Cancelled') {
      await client.query(
        `UPDATE invoices SET status='Cancelled' WHERE id=$1`,
        [req.params.id]
      );
      // Restore stock for INVOICE_SALE items — idempotent (restoreInvoiceStock checks for prior reversal)
      await restoreInvoiceStock(client, req.params.id, req.user.id);
    }
    // If already cancelled, do nothing — idempotent

    await client.query('COMMIT');
    const fullInvoice = await fetchFullInvoice(req.params.id);
    res.json(fullInvoice);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/invoices/:id  — Admin only
// Restores stock exactly once before deleting. Idempotent reversal check applied.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireRoles(...ADMIN_ONLY), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: invoiceRows } = await client.query(
      'SELECT id, status FROM invoices WHERE id=$1 FOR UPDATE',
      [req.params.id]
    );
    if (!invoiceRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceRows[0];

    // Restore stock if not already reversed (cancelled invoices already had stock restored)
    if (invoice.status !== 'Cancelled') {
      await restoreInvoiceStock(client, req.params.id, req.user.id);
    }
    // For already-cancelled: restoreInvoiceStock will find existing reversal and skip (idempotent)

    // Delete invoice (CASCADE deletes invoice_items)
    await client.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);

    await client.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
