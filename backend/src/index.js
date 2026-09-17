require('dotenv').config();
const express = require('express');
const cors = require('cors');

const customerRoutes = require('./routes/customers');
const jobRoutes = require('./routes/jobs');
const partRoutes = require('./routes/parts');
const invoiceRoutes = require('./routes/invoices');
const staffRoutes = require('./routes/staff');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken, requireRoles, CAN_READ_DASHBOARD } = require('./middleware/auth');
const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 4000;

/* ── CORS ──
 * In production behind NGINX, the frontend and /api share the same origin, so
 * CORS restrictions are an extra safety net rather than the primary control.
 * We accept an explicit allow-list via FRONTEND_URL. Multiple origins can be
 * provided as a comma-separated list (e.g. "http://192.168.1.10:3000,http://localhost:3000").
 * If FRONTEND_URL is not set we fall back to localhost only.
 */
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin via NGINX proxy, curl, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

/* ── Routes ── */
app.use('/api/auth', authRoutes);          // Login is public — no auth middleware here
app.use('/api/customers', customerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/devices', deviceRoutes);

/* ── Dashboard stats (Admin + Manager only) ── */
app.get('/api/stats',
  authenticateToken,
  requireRoles(...CAN_READ_DASHBOARD),
  async (req, res, next) => {
    try {
      const [openJobs, lowStock, unpaidInvoices, revenue] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) FROM service_jobs WHERE status NOT IN ('Completed','Cancelled','Unrepairable')`
        ),
        pool.query(
          `SELECT COUNT(*) FROM parts WHERE quantity <= min_quantity AND min_quantity > 0`
        ),
        pool.query(
          `SELECT COUNT(*) FROM invoices WHERE status = 'Unpaid'`
        ),
        pool.query(
          `SELECT COALESCE(SUM(total),0) AS total FROM invoices WHERE status = 'Paid'`
        ),
      ]);
      res.json({
        openJobs: parseInt(openJobs.rows[0].count, 10),
        lowStockParts: parseInt(lowStock.rows[0].count, 10),
        unpaidInvoices: parseInt(unpaidInvoices.rows[0].count, 10),
        totalRevenue: parseFloat(revenue.rows[0].total),
      });
    } catch (err) { next(err); }
  }
);

/* ── Recent activity (Admin + Manager only) ── */
app.get('/api/recent',
  authenticateToken,
  requireRoles(...CAN_READ_DASHBOARD),
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(`
        SELECT j.id, j.device_type, j.device_model, j.status, j.created_at,
               c.name AS customer_name
        FROM service_jobs j
        LEFT JOIN customers c ON j.customer_id = c.id
        ORDER BY j.created_at DESC
        LIMIT 8
      `);
      res.json(rows);
    } catch (err) { next(err); }
  }
);

/* ── Health (intentionally public — used by Docker healthcheck) ── */
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

/* ── Error handler (must be last) ── */
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ FixDesk backend listening on http://localhost:${PORT}`);
  console.log(`✓ CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
