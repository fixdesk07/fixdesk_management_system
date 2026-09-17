const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const {
  authenticateToken,
  requireRoles,
  CAN_MANAGE_CUSTOMERS,
  ADMIN_ONLY,
} = require('../middleware/auth');

// All customer routes require authentication.
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customers
//
// IMPORTANT: total_spent uses a correlated subquery, NOT a JOIN, to prevent
// Cartesian-product row multiplication when a customer has both multiple jobs
// and multiple invoices.
//
// total_spent = sum of PAID invoices for this customer.
// jobs_count  = number of service jobs for this customer.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireRoles(...CAN_MANAGE_CUSTOMERS), async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT
        c.*,
        (SELECT COUNT(*)::int FROM service_jobs j WHERE j.customer_id = c.id) AS jobs_count,
        (SELECT COALESCE(SUM(i.total), 0)
           FROM invoices i
           WHERE i.customer_id = c.id AND i.status = 'Paid') AS total_spent
      FROM customers c
      WHERE 1=1
    `;
    let params = [];
    if (search) {
      params = [`%${search}%`];
      query += ` AND (c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1)`;
    }
    query += ' ORDER BY c.created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customers/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', requireRoles(...CAN_MANAGE_CUSTOMERS), async (req, res, next) => {
  try {
    const { rows: custRows } = await pool.query(`
      SELECT
        c.*,
        (SELECT COUNT(*)::int FROM service_jobs j WHERE j.customer_id = c.id) AS jobs_count,
        (SELECT COALESCE(SUM(i.total), 0)
           FROM invoices i
           WHERE i.customer_id = c.id AND i.status = 'Paid') AS total_spent
      FROM customers c
      WHERE c.id = $1
    `, [req.params.id]);

    if (!custRows.length) return res.status(404).json({ error: 'Customer not found' });

    const { rows: jobs } = await pool.query(`
      SELECT j.*,
             i.id AS invoice_id,
             i.total AS invoice_total,
             i.status AS invoice_status,
             (SELECT COUNT(*)::int FROM job_parts jp WHERE jp.job_id = j.id) AS parts_used_count
      FROM service_jobs j
      LEFT JOIN invoices i ON i.job_id = j.id
      WHERE j.customer_id = $1
      ORDER BY j.created_at DESC
    `, [req.params.id]);

    const { rows: invoices } = await pool.query(`
      SELECT i.*, j.device_brand, j.device_model
      FROM invoices i
      LEFT JOIN service_jobs j ON i.job_id = j.id
      WHERE i.customer_id = $1
      ORDER BY i.issued_at DESC
    `, [req.params.id]);

    res.json({ ...custRows[0], jobs, invoices });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/customers  — Admin, Receptionist, Manager
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireRoles(...CAN_MANAGE_CUSTOMERS), async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!phone?.trim()) return res.status(400).json({ error: 'phone is required' });

    const { rows } = await pool.query(
      `INSERT INTO customers (id, name, phone, email, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [uuidv4(), name.trim(), phone.trim(), email || null, address || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/customers/:id  — Admin, Receptionist, Manager
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireRoles(...CAN_MANAGE_CUSTOMERS), async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!phone?.trim()) return res.status(400).json({ error: 'phone is required' });

    const { rows } = await pool.query(
      `UPDATE customers SET name=$1, phone=$2, email=$3, address=$4, notes=$5
       WHERE id=$6 RETURNING *`,
      [name.trim(), phone.trim(), email || null, address || null, notes || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/customers/:id  — Admin only
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireRoles(...ADMIN_ONLY), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
