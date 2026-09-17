const jwt = require('jsonwebtoken');

// Fail fast at startup if no JWT_SECRET is configured.
// Never use a hardcoded fallback in production — that would defeat the
// purpose of JWT signing entirely.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error(
    '[FATAL] JWT_SECRET environment variable is not set. ' +
    'Set a strong random secret in your .env file or container environment. ' +
    'Server will not start without it.'
  );
  process.exit(1);
}

// ─────────────────────────────────────────
//  Role permission matrix
//  This is the single source of truth for what each role is allowed to do.
//  Extend Manager-specific permissions here in Phase 3+ rather than
//  duplicating role checks throughout route files.
// ─────────────────────────────────────────
const ROLES = {
  ADMIN:        'Admin',
  TECHNICIAN:   'Technician',
  RECEPTIONIST: 'Receptionist',
  MANAGER:      'Manager',
};

// Convenience permission groups — add new roles here, not in route files.
const CAN_MANAGE_CUSTOMERS  = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.MANAGER];
const CAN_READ_JOBS         = [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.RECEPTIONIST, ROLES.MANAGER];
const CAN_WRITE_JOBS        = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.MANAGER];
const CAN_PATCH_JOB_STATUS  = [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.RECEPTIONIST, ROLES.MANAGER];
const CAN_MANAGE_JOB_PARTS  = [ROLES.ADMIN, ROLES.TECHNICIAN];
const CAN_READ_PARTS        = [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.RECEPTIONIST, ROLES.MANAGER];
const CAN_WRITE_PARTS       = [ROLES.ADMIN];
const CAN_MANAGE_INVOICES   = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.MANAGER];
const CAN_READ_DEVICES      = [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.RECEPTIONIST, ROLES.MANAGER];
const CAN_WRITE_DEVICES     = [ROLES.ADMIN, ROLES.TECHNICIAN];
const CAN_MANAGE_STAFF      = [ROLES.ADMIN];
const CAN_READ_DASHBOARD    = [ROLES.ADMIN, ROLES.MANAGER];
const ADMIN_ONLY            = [ROLES.ADMIN];

/**
 * Middleware: verify Bearer JWT, attach decoded payload to req.user.
 * Returns 401 if no token is present, 403 if token is invalid/expired.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware factory: enforce that the authenticated user has one of the
 * allowed roles. Must be called AFTER authenticateToken.
 *
 * @param {...string} allowedRoles - roles permitted to use this route
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  ROLES,
  CAN_MANAGE_CUSTOMERS,
  CAN_READ_JOBS,
  CAN_WRITE_JOBS,
  CAN_PATCH_JOB_STATUS,
  CAN_MANAGE_JOB_PARTS,
  CAN_READ_PARTS,
  CAN_WRITE_PARTS,
  CAN_MANAGE_INVOICES,
  CAN_READ_DEVICES,
  CAN_WRITE_DEVICES,
  CAN_MANAGE_STAFF,
  CAN_READ_DASHBOARD,
  ADMIN_ONLY,
  authenticateToken,
  requireRoles,
};
