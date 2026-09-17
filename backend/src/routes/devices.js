const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const {
  authenticateToken,
  requireRoles,
  CAN_READ_DEVICES,
  CAN_WRITE_DEVICES,
  ADMIN_ONLY,
} = require('../middleware/auth');

// All device routes require authentication.
router.use(authenticateToken);

// ─────────────────────────────────────────
//  DEVICE CATALOG (Combined Hierarchical Tree)
// ─────────────────────────────────────────

// GET /api/devices/catalog  — All authenticated roles (used in job forms)
router.get('/catalog', requireRoles(...CAN_READ_DEVICES), async (req, res, next) => {
  try {
    const { rows: types } = await pool.query('SELECT * FROM device_types ORDER BY name ASC');
    const { rows: brands } = await pool.query('SELECT * FROM device_brands ORDER BY name ASC');
    const { rows: models } = await pool.query('SELECT * FROM device_models ORDER BY name ASC');

    res.json({
      types,
      brands,
      models,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────
//  DEVICE TYPES
// ─────────────────────────────────────────

// GET /api/devices/types  — All authenticated roles
router.get('/types', requireRoles(...CAN_READ_DEVICES), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT dt.*,
             COUNT(DISTINCT db.id)::int AS brands_count,
             COUNT(DISTINCT dm.id)::int AS models_count
      FROM device_types dt
      LEFT JOIN device_brands db ON db.device_type = dt.name
      LEFT JOIN device_models dm ON dm.device_type = dt.name
      GROUP BY dt.id
      ORDER BY dt.name ASC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/devices/types  — Admin, Technician
router.post('/types', requireRoles(...CAN_WRITE_DEVICES), async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Device type name is required' });

    const { rows } = await pool.query(
      `INSERT INTO device_types (id, name, description, icon)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [uuidv4(), name.trim(), description || null, icon || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Device type already exists' });
    next(err);
  }
});

// DELETE /api/devices/types/:id  — Admin only
router.delete('/types/:id', requireRoles(...ADMIN_ONLY), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT name FROM device_types WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Device type not found' });
    const typeName = rows[0].name;

    await pool.query('DELETE FROM device_models WHERE device_type = $1', [typeName]);
    await pool.query('DELETE FROM device_brands WHERE device_type = $1', [typeName]);
    await pool.query('DELETE FROM device_types WHERE id = $1', [req.params.id]);

    res.status(204).end();
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────
//  DEVICE BRANDS
// ─────────────────────────────────────────

// GET /api/devices/brands  — All authenticated roles
router.get('/brands', requireRoles(...CAN_READ_DEVICES), async (req, res, next) => {
  try {
    const { device_type, search } = req.query;
    let query = `
      SELECT db.*,
             COUNT(DISTINCT dm.id)::int AS models_count
      FROM device_brands db
      LEFT JOIN device_models dm ON dm.brand = db.name AND dm.device_type = db.device_type
      WHERE 1=1
    `;
    const params = [];
    if (device_type) {
      params.push(device_type);
      query += ` AND db.device_type = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (db.name ILIKE $${params.length} OR db.device_type ILIKE $${params.length})`;
    }
    query += ' GROUP BY db.id ORDER BY db.device_type ASC, db.name ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/devices/brands  — Admin, Technician
router.post('/brands', requireRoles(...CAN_WRITE_DEVICES), async (req, res, next) => {
  try {
    const { name, device_type } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Brand name is required' });
    if (!device_type?.trim()) return res.status(400).json({ error: 'Device type is required' });

    const { rows } = await pool.query(
      `INSERT INTO device_brands (id, name, device_type)
       VALUES ($1, $2, $3) RETURNING *`,
      [uuidv4(), name.trim(), device_type.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'This brand already exists for this device type' });
    next(err);
  }
});

// DELETE /api/devices/brands/:id  — Admin only
router.delete('/brands/:id', requireRoles(...ADMIN_ONLY), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT name, device_type FROM device_brands WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Brand not found' });
    const { name, device_type } = rows[0];

    await pool.query('DELETE FROM device_models WHERE brand = $1 AND device_type = $2', [name, device_type]);
    await pool.query('DELETE FROM device_brands WHERE id = $1', [req.params.id]);

    res.status(204).end();
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────
//  DEVICE MODELS
// ─────────────────────────────────────────

// GET /api/devices/models  — All authenticated roles
router.get('/models', requireRoles(...CAN_READ_DEVICES), async (req, res, next) => {
  try {
    const { device_type, brand, search } = req.query;
    let query = 'SELECT * FROM device_models WHERE 1=1';
    const params = [];

    if (device_type) {
      params.push(device_type);
      query += ` AND device_type = $${params.length}`;
    }
    if (brand) {
      params.push(brand);
      query += ` AND brand = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (name ILIKE $${params.length} OR brand ILIKE $${params.length} OR device_type ILIKE $${params.length})`;
    }
    query += ' ORDER BY device_type ASC, brand ASC, name ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/devices/models  — Admin, Technician
router.post('/models', requireRoles(...CAN_WRITE_DEVICES), async (req, res, next) => {
  try {
    const { name, brand, device_type } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Model name is required' });
    if (!brand?.trim()) return res.status(400).json({ error: 'Brand is required' });
    if (!device_type?.trim()) return res.status(400).json({ error: 'Device type is required' });

    // Also auto-ensure brand exists in device_brands table
    await pool.query(
      `INSERT INTO device_brands (id, name, device_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (name, device_type) DO NOTHING`,
      [uuidv4(), brand.trim(), device_type.trim()]
    );

    const { rows } = await pool.query(
      `INSERT INTO device_models (id, name, brand, device_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [uuidv4(), name.trim(), brand.trim(), device_type.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'This model already exists for this brand and device type' });
    next(err);
  }
});

// DELETE /api/devices/models/:id  — Admin only
router.delete('/models/:id', requireRoles(...ADMIN_ONLY), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM device_models WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
