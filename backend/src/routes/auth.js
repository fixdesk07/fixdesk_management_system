const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login  (accepts username OR email + password)
// This is the only intentionally public route in the entire API.
router.post('/login', async (req, res, next) => {
  try {
    const { username, email, identifier, password } = req.body;
    const loginId = (username || email || identifier || '').trim();

    if (!loginId) return res.status(400).json({ error: 'Username or email is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const { rows } = await pool.query(`
      SELECT * FROM users
      WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
    `, [loginId]);

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  — verify current token and return fresh user profile
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name, email, role, phone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// NOTE: /api/auth/demo-accounts has been intentionally removed.
// Exposing usernames, passwords, or roles via an API endpoint is a security risk.
// Demo/seed accounts are managed via database migrations only (004_staff_credentials.sql).

module.exports = router;
