const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const {
  authenticateToken,
  requireRoles,
  CAN_READ_PARTS,
  CAN_WRITE_PARTS,
} = require('../middleware/auth');

// All parts routes require authentication.
router.use(authenticateToken);

// GET /api/parts  — Admin, Technician, Receptionist, Manager
router.get('/', requireRoles(...CAN_READ_PARTS), async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT *, (quantity <= min_quantity AND min_quantity > 0) AS low_stock
      FROM parts ORDER BY name ASC
    `;
    let params = [];
    if (search) {
      query = `
        SELECT *, (quantity <= min_quantity AND min_quantity > 0) AS low_stock
        FROM parts WHERE name ILIKE $1 OR part_number ILIKE $1 OR supplier ILIKE $1
        ORDER BY name ASC
      `;
      params = [`%${search}%`];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/parts/:id  — Admin, Technician, Receptionist, Manager
router.get('/:id', requireRoles(...CAN_READ_PARTS), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM parts WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Part not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/parts  — Admin only
router.post('/', requireRoles(...CAN_WRITE_PARTS), async (req, res, next) => {
  try {
    const { name, part_number, compatible_models, quantity, min_quantity,
            purchase_price, selling_price, supplier } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!part_number?.trim()) return res.status(400).json({ error: 'part_number is required' });

    const { rows } = await pool.query(
      `INSERT INTO parts
         (id, name, part_number, compatible_models, quantity, min_quantity, purchase_price, selling_price, supplier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        uuidv4(), name.trim(), part_number.trim(),
        compatible_models || null,
        quantity || 0, min_quantity || 0,
        purchase_price || 0, selling_price || 0,
        supplier || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Part number already exists' });
    next(err);
  }
});

// PUT /api/parts/:id  — Admin only
router.put('/:id', requireRoles(...CAN_WRITE_PARTS), async (req, res, next) => {
  try {
    const { name, part_number, compatible_models, quantity, min_quantity,
            purchase_price, selling_price, supplier } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!part_number?.trim()) return res.status(400).json({ error: 'part_number is required' });

    const { rows } = await pool.query(`
      UPDATE parts SET
        name=$1, part_number=$2, compatible_models=$3,
        quantity=$4, min_quantity=$5, purchase_price=$6,
        selling_price=$7, supplier=$8
      WHERE id=$9 RETURNING *`,
      [
        name.trim(), part_number.trim(),
        compatible_models || null,
        quantity || 0, min_quantity || 0,
        purchase_price || 0, selling_price || 0,
        supplier || null, req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Part not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Part number already exists' });
    next(err);
  }
});

// DELETE /api/parts/:id  — Admin only
router.delete('/:id', requireRoles(...CAN_WRITE_PARTS), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM parts WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
