const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const {
  authenticateToken,
  requireRoles,
  CAN_MANAGE_STAFF,
} = require('../middleware/auth');

// Staff creation via UI cannot create Admin — prevents privilege escalation.
// Admin accounts are created only via DB migrations.
const VALID_ROLES = ['Technician', 'Receptionist', 'Manager'];
const VALID_STATUSES = ['Active', 'Inactive', 'On Leave'];

// All staff routes: authentication + Admin-only authorization.
router.use(authenticateToken);
router.use(requireRoles(...CAN_MANAGE_STAFF));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/staff
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    let query = `
      SELECT s.*,
        (SELECT COUNT(*)::int
           FROM service_jobs j
           WHERE (j.technician_id = s.id OR LOWER(j.technician) = LOWER(s.name))
             AND j.status NOT IN ('Completed','Cancelled','Unrepairable')) AS active_jobs_count
      FROM staff s
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      params.push(role);
      query += ` AND s.role = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (s.name ILIKE $${params.length} OR s.username ILIKE $${params.length} OR s.email ILIKE $${params.length} OR s.phone ILIKE $${params.length} OR s.specialization ILIKE $${params.length})`;
    }

    query += ' ORDER BY s.role ASC, s.name ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/staff/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM staff WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Staff member not found' });

    const { rows: jobs } = await pool.query(`
      SELECT id, device_type, device_brand, device_model, status, created_at
      FROM service_jobs
      WHERE technician_id = $1 OR LOWER(technician) = LOWER($2)
      ORDER BY created_at DESC
      LIMIT 10
    `, [rows[0].id, rows[0].name]);

    res.json({ ...rows[0], recent_jobs: jobs });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/staff  — Creates staff record + auth user in a single transaction.
// Uses staff.user_id FK to maintain explicit relationship.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, username, password, email, phone, role, specialization, status, notes } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Full name is required' });
    if (!username?.trim()) return res.status(400).json({ error: 'Username is required' });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!phone?.trim()) return res.status(400).json({ error: 'Phone number is required' });
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Valid role is required. Options: ${VALID_ROLES.join(', ')}` });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : `${cleanUsername}@fixdesk.com`;
    const staffStatus = status && VALID_STATUSES.includes(status) ? status : 'Active';

    await client.query('BEGIN');

    // Check for conflicts in both tables before creating anything
    const { rows: existingUser } = await client.query(
      'SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2',
      [cleanUsername, cleanEmail]
    );
    if (existingUser.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Username or email '${cleanUsername}' is already taken` });
    }

    const { rows: existingStaff } = await client.query(
      'SELECT id FROM staff WHERE LOWER(username) = $1',
      [cleanUsername]
    );
    if (existingStaff.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Staff username '${cleanUsername}' already exists` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const staffId = uuidv4();

    // 1. Create Users record first (staff FK references users)
    await client.query(
      `INSERT INTO users (id, username, name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, cleanUsername, name.trim(), cleanEmail, passwordHash, role, phone.trim()]
    );

    // 2. Create Staff record with explicit user_id FK
    const { rows } = await client.query(
      `INSERT INTO staff (id, name, username, email, phone, role, specialization, status, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        staffId, name.trim(), cleanUsername, cleanEmail, phone.trim(),
        role, specialization?.trim() || null, staffStatus, notes?.trim() || null,
        userId,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/staff/:id  — Updates staff + linked user in a single transaction.
// Uses user_id FK for the user update — no username string matching.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, username, password, email, phone, role, specialization, status, notes } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Full name is required' });
    if (!phone?.trim()) return res.status(400).json({ error: 'Phone number is required' });
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Valid role is required. Options: ${VALID_ROLES.join(', ')}` });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Valid status required. Options: ${VALID_STATUSES.join(', ')}` });
    }

    await client.query('BEGIN');

    // Lock the row to prevent concurrent modifications
    const prev = await client.query('SELECT * FROM staff WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!prev.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Staff member not found' });
    }
    const oldStaff = prev.rows[0];

    const cleanUsername = username?.trim() ? username.trim().toLowerCase() : oldStaff.username;
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : oldStaff.email;

    // If username is changing, check it's not taken
    if (cleanUsername !== oldStaff.username) {
      const { rows: conflict } = await client.query(
        'SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2',
        [cleanUsername, oldStaff.user_id]
      );
      if (conflict.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Username '${cleanUsername}' is already taken` });
      }
    }

    // 1. Update staff table
    const { rows } = await client.query(
      `UPDATE staff SET
         name=$1, username=$2, email=$3, phone=$4, role=$5,
         specialization=$6, status=$7, notes=$8, updated_at=now()
       WHERE id=$9
       RETURNING *`,
      [
        name.trim(), cleanUsername, cleanEmail, phone.trim(), role,
        specialization?.trim() || null, status || 'Active',
        notes?.trim() || null, req.params.id,
      ]
    );

    // 2. Update the linked user record via user_id FK (reliable — no string matching)
    if (oldStaff.user_id) {
      if (password && password.trim().length >= 6) {
        const passwordHash = await bcrypt.hash(password, 10);
        await client.query(
          `UPDATE users SET
             username=$1, name=$2, email=$3, password_hash=$4, role=$5, phone=$6, updated_at=now()
           WHERE id=$7`,
          [cleanUsername, name.trim(), cleanEmail, passwordHash, role, phone.trim(), oldStaff.user_id]
        );
      } else {
        await client.query(
          `UPDATE users SET
             username=$1, name=$2, email=$3, role=$4, phone=$5, updated_at=now()
           WHERE id=$6`,
          [cleanUsername, name.trim(), cleanEmail, role, phone.trim(), oldStaff.user_id]
        );
      }
    } else {
      // Legacy staff without user_id: fall back to username match, then link
      if (cleanUsername) {
        if (password && password.trim().length >= 6) {
          const passwordHash = await bcrypt.hash(password, 10);
          await client.query(
            `INSERT INTO users (username, name, email, password_hash, role, phone)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (username) DO UPDATE SET
               name=EXCLUDED.name, email=EXCLUDED.email,
               password_hash=EXCLUDED.password_hash, role=EXCLUDED.role,
               phone=EXCLUDED.phone, updated_at=now()`,
            [cleanUsername, name.trim(), cleanEmail, passwordHash, role, phone.trim()]
          );
        } else {
          await client.query(
            `UPDATE users SET name=$1, email=$2, role=$3, phone=$4, updated_at=now()
             WHERE LOWER(username) = LOWER($5) OR LOWER(email) = LOWER($6)`,
            [name.trim(), cleanEmail, role, phone.trim(), cleanUsername, oldStaff.email]
          );
        }
        // Try to link user_id now
        const { rows: userRows } = await client.query(
          'SELECT id FROM users WHERE LOWER(username) = $1',
          [cleanUsername]
        );
        if (userRows.length) {
          await client.query(
            'UPDATE staff SET user_id=$1 WHERE id=$2',
            [userRows[0].id, req.params.id]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/staff/:id  — Admin only
// Deletes staff and linked user in a single transaction.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prev = await client.query('SELECT * FROM staff WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!prev.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Staff member not found' });
    }
    const staffMember = prev.rows[0];

    // Delete staff first (staff.user_id FK has ON DELETE SET NULL on users)
    await client.query('DELETE FROM staff WHERE id = $1', [req.params.id]);

    // Delete linked user via user_id FK (reliable)
    if (staffMember.user_id) {
      await client.query('DELETE FROM users WHERE id = $1', [staffMember.user_id]);
    } else if (staffMember.username) {
      // Legacy fallback
      await client.query('DELETE FROM users WHERE LOWER(username) = LOWER($1)', [staffMember.username]);
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
