const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const {
  authenticateToken,
  requireRoles,
  CAN_READ_JOBS,
  CAN_WRITE_JOBS,
  CAN_PATCH_JOB_STATUS,
  CAN_MANAGE_JOB_PARTS,
  ADMIN_ONLY,
} = require('../middleware/auth');

// All job routes require authentication.
router.use(authenticateToken);

const VALID_STATUSES = [
  'Received', 'Diagnosis', 'Waiting for Approval', 'Approved',
  'Repairing', 'Quality Check', 'Ready for Pickup', 'Completed',
  'Waiting for Parts', 'Unrepairable', 'Cancelled',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atomically deduct stock for a single part within an existing client transaction.
 * Returns the updated part row, or throws if stock is insufficient.
 *
 * @param {object} client  — pg client already inside BEGIN
 * @param {string} partId
 * @param {number} qty     — quantity to deduct (must be >= 1)
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
    // Either part not found or insufficient stock — differentiate for a clearer message
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jobs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireRoles(...CAN_READ_JOBS), async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT j.*,
             c.name AS customer_name, c.phone AS customer_phone,
             s.name AS technician_name, s.id AS technician_staff_id
      FROM service_jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN staff s ON j.technician_id = s.id
      WHERE 1=1
    `;
    let params = [];
    if (status) {
      params.push(status);
      query += ` AND j.status = $${params.length}`;
    }
    if (search) {
      const cleanSearch = search.trim().replace(/^#?job-?/i, '');
      params.push(`%${cleanSearch}%`);
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern);
      query += ` AND (
        j.job_code ILIKE $${params.length - 1} OR
        j.job_code ILIKE $${params.length} OR
        j.id::text ILIKE $${params.length - 1} OR
        j.serial_number ILIKE $${params.length - 1} OR
        LPAD(COALESCE(j.job_number, 0)::text, 4, '0') ILIKE $${params.length - 1} OR
        c.name ILIKE $${params.length}
      )`;
    }
    query += ` ORDER BY j.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jobs/:id  (with parts)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', requireRoles(...CAN_READ_JOBS), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*,
             c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
             s.name AS technician_name, s.id AS technician_staff_id
      FROM service_jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN staff s ON j.technician_id = s.id
      WHERE j.id = $1 OR j.job_code = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });

    const job = rows[0];

    const { rows: parts } = await pool.query(`
      SELECT jp.id, jp.quantity_used, jp.unit_price,
             p.id AS part_id, p.name AS part_name, p.part_number, p.quantity AS stock_available
      FROM job_parts jp
      LEFT JOIN parts p ON jp.part_id = p.id
      WHERE jp.job_id = $1
    `, [job.id]);

    res.json({ ...job, parts });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs  — Admin, Receptionist, Manager
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireRoles(...CAN_WRITE_JOBS), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      customer_id, customer, new_customer,
      device_type, device_brand, device_model, serial_number,
      problem_description, technician, technician_id: bodyTechnicianId,
      estimated_cost, status
    } = req.body;

    let targetCustomerId = customer_id;
    const custPayload = customer || new_customer;

    await client.query('BEGIN');

    if (!targetCustomerId && custPayload) {
      if (!custPayload.name?.trim()) throw Object.assign(new Error('Customer name is required'), { statusCode: 400 });
      if (!custPayload.phone?.trim()) throw Object.assign(new Error('Customer phone is required'), { statusCode: 400 });

      const { rows: custRows } = await client.query(
        `INSERT INTO customers (id, name, phone, email, address, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [uuidv4(), custPayload.name.trim(), custPayload.phone.trim(),
         custPayload.email || null, custPayload.address || null, custPayload.notes || null]
      );
      targetCustomerId = custRows[0].id;
    }

    if (!targetCustomerId) throw Object.assign(new Error('customer_id or new customer details are required'), { statusCode: 400 });
    if (!device_type?.trim()) throw Object.assign(new Error('device_type is required'), { statusCode: 400 });
    if (!device_brand?.trim()) throw Object.assign(new Error('device_brand is required'), { statusCode: 400 });
    if (!device_model?.trim()) throw Object.assign(new Error('device_model is required'), { statusCode: 400 });
    if (!serial_number?.trim()) throw Object.assign(new Error('serial_number is required'), { statusCode: 400 });

    // Resolve technician: prefer technician_id from body, else look up by name
    let resolvedTechnicianId = bodyTechnicianId || null;
    let resolvedTechnicianName = technician || null;

    if (!resolvedTechnicianId && technician) {
      const { rows: techRows } = await client.query(
        'SELECT id, name FROM staff WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [technician]
      );
      if (techRows.length) {
        resolvedTechnicianId = techRows[0].id;
        resolvedTechnicianName = techRows[0].name;
      }
    } else if (resolvedTechnicianId && !resolvedTechnicianName) {
      const { rows: techRows } = await client.query(
        'SELECT name FROM staff WHERE id = $1',
        [resolvedTechnicianId]
      );
      if (techRows.length) resolvedTechnicianName = techRows[0].name;
    }

    const jobStatus = status && VALID_STATUSES.includes(status) ? status : 'Received';
    const jobId = uuidv4();

    // job_code_seq is a DB sequence — concurrent-safe by design
    const { rows: seqRows } = await client.query("SELECT nextval('job_code_seq') AS num");
    const jobNum = parseInt(seqRows[0].num, 10);
    const jobCode = 'JOB-' + String(jobNum).padStart(4, '0');

    await client.query(
      `INSERT INTO service_jobs
         (id, customer_id, device_type, device_brand, device_model, serial_number,
          problem_description, status, technician, technician_id, estimated_cost, job_number, job_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        jobId, targetCustomerId, device_type.trim(),
        device_brand.trim(), device_model.trim(), serial_number.trim(),
        problem_description || null, jobStatus,
        resolvedTechnicianName, resolvedTechnicianId,
        estimated_cost !== undefined && estimated_cost !== null && estimated_cost !== ''
          ? parseFloat(estimated_cost) : null,
        jobNum, jobCode,
      ]
    );

    await client.query('COMMIT');

    const { rows: fullJob } = await pool.query(`
      SELECT j.*,
             c.name AS customer_name, c.phone AS customer_phone,
             s.name AS technician_name, s.id AS technician_staff_id
      FROM service_jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN staff s ON j.technician_id = s.id
      WHERE j.id = $1
    `, [jobId]);

    res.status(201).json(fullJob[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/jobs/:id  — Admin, Receptionist, Manager
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireRoles(...CAN_WRITE_JOBS), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      customer_id, device_type, device_brand, device_model, serial_number,
      problem_description, status, technician, technician_id: bodyTechnicianId,
      estimated_cost
    } = req.body;

    if (!customer_id) throw Object.assign(new Error('customer_id is required'), { statusCode: 400 });
    if (!device_type?.trim()) throw Object.assign(new Error('device_type is required'), { statusCode: 400 });
    if (!device_brand?.trim()) throw Object.assign(new Error('device_brand is required'), { statusCode: 400 });
    if (!device_model?.trim()) throw Object.assign(new Error('device_model is required'), { statusCode: 400 });
    if (!serial_number?.trim()) throw Object.assign(new Error('serial_number is required'), { statusCode: 400 });
    if (!status || !VALID_STATUSES.includes(status)) {
      throw Object.assign(new Error(`Valid status is required. Options: ${VALID_STATUSES.join(', ')}`), { statusCode: 400 });
    }

    // Resolve technician
    let resolvedTechnicianId = bodyTechnicianId || null;
    let resolvedTechnicianName = technician || null;

    if (!resolvedTechnicianId && technician) {
      const { rows: techRows } = await pool.query(
        'SELECT id, name FROM staff WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [technician]
      );
      if (techRows.length) {
        resolvedTechnicianId = techRows[0].id;
        resolvedTechnicianName = techRows[0].name;
      }
    } else if (resolvedTechnicianId && !resolvedTechnicianName) {
      const { rows: techRows } = await pool.query(
        'SELECT name FROM staff WHERE id = $1',
        [resolvedTechnicianId]
      );
      if (techRows.length) resolvedTechnicianName = techRows[0].name;
    }

    await client.query('BEGIN');

    const { rows } = await client.query(`
      UPDATE service_jobs SET
        customer_id=$1, device_type=$2, device_brand=$3, device_model=$4,
        serial_number=$5, problem_description=$6, status=$7,
        technician=$8, technician_id=$9, estimated_cost=$10, updated_at=now()
      WHERE id=$11 RETURNING *`,
      [
        customer_id, device_type.trim(), device_brand.trim(), device_model.trim(),
        serial_number.trim(), problem_description || null, status,
        resolvedTechnicianName, resolvedTechnicianId,
        estimated_cost !== undefined && estimated_cost !== null && estimated_cost !== ''
          ? parseFloat(estimated_cost) : null,
        req.params.id,
      ]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Job not found' });
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/jobs/:id/status  — lightweight status-only update
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', requireRoles(...CAN_PATCH_JOB_STATUS), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const { rows } = await pool.query(
      `UPDATE service_jobs SET status=$1, updated_at=now() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/jobs/:id — Admin only
// Restores stock for ALL attached job_parts atomically before deleting.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireRoles(...ADMIN_ONLY), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch attached parts before deleting
    const { rows: attachedParts } = await client.query(
      'SELECT jp.part_id, jp.quantity_used FROM job_parts jp WHERE jp.job_id = $1',
      [req.params.id]
    );

    // Restore stock and record movement for each part
    for (const jp of attachedParts) {
      if (!jp.part_id) continue; // part was deleted from catalog — skip
      await client.query(
        'UPDATE parts SET quantity = quantity + $1 WHERE id = $2',
        [jp.quantity_used, jp.part_id]
      );
      await recordMovement(client, {
        partId: jp.part_id,
        quantity: jp.quantity_used,   // positive = stock returning
        movementType: 'JOB_USAGE_REVERSAL',
        referenceType: 'job',
        referenceId: req.params.id,
        notes: 'Job deleted — stock restored',
        createdBy: req.user.id,
      });
    }

    // CASCADE deletes job_parts automatically (FK with ON DELETE CASCADE)
    const { rowCount } = await client.query('DELETE FROM service_jobs WHERE id=$1', [req.params.id]);

    await client.query('COMMIT');

    if (!rowCount) return res.status(404).json({ error: 'Job not found' });
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs/:id/parts  — attach a part, deduct stock atomically
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/parts', requireRoles(...CAN_MANAGE_JOB_PARTS), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { part_id, quantity_used, unit_price } = req.body;
    if (!part_id) return res.status(400).json({ error: 'part_id is required' });
    const qty = parseInt(quantity_used || 1, 10);
    if (qty < 1) return res.status(400).json({ error: 'quantity_used must be at least 1' });

    await client.query('BEGIN');

    // Verify job exists
    const { rows: jobRows } = await client.query('SELECT id FROM service_jobs WHERE id = $1', [req.params.id]);
    if (!jobRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Job not found' });
    }

    // Atomic stock deduction — throws 409 if insufficient
    await deductStock(client, part_id, qty);

    const { rows } = await client.query(
      `INSERT INTO job_parts (id, job_id, part_id, quantity_used, unit_price)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [uuidv4(), req.params.id, part_id, qty, unit_price || 0]
    );

    // Record inventory movement
    await recordMovement(client, {
      partId: part_id,
      quantity: -qty,  // negative = stock going out
      movementType: 'JOB_USAGE',
      referenceType: 'job',
      referenceId: req.params.id,
      notes: `Attached to job`,
      createdBy: req.user.id,
    });

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/jobs/:id/parts/:jpId  — remove part, restore stock atomically
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id/parts/:jpId', requireRoles(...CAN_MANAGE_JOB_PARTS), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'DELETE FROM job_parts WHERE id=$1 RETURNING *',
      [req.params.jpId]
    );

    if (rows.length && rows[0].part_id) {
      // Restore stock
      await client.query(
        'UPDATE parts SET quantity = quantity + $1 WHERE id=$2',
        [rows[0].quantity_used, rows[0].part_id]
      );
      // Record reversal
      await recordMovement(client, {
        partId: rows[0].part_id,
        quantity: rows[0].quantity_used,  // positive = stock returning
        movementType: 'JOB_USAGE_REVERSAL',
        referenceType: 'job',
        referenceId: req.params.id,
        notes: 'Part removed from job',
        createdBy: req.user.id,
      });
    }

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
