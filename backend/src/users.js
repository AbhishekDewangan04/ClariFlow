/**
 * users.js — User management for ClariFlow.
 *
 * Roles (stored as lowercase strings in the DB):
 *   admin   – full access, user management
 *   manager – full order mutations, no user management
 *   staff   – limited order mutations (PROCESSING → SHIPPED only)
 */

const bcrypt = require("bcrypt");
const { getPool } = require("./db");

const SALT_ROUNDS = 12;
const VALID_ROLES = ["admin", "manager", "staff"];

/**
 * Ensure the User and AuditLog tables exist.
 * Called once on server startup (from db.js / connectDatabase).
 */
async function ensureUserTables() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "User" (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) UNIQUE NOT NULL,
      name       VARCHAR(255) NOT NULL,
      password   VARCHAR(255) NOT NULL,
      role       VARCHAR(50)  NOT NULL DEFAULT 'staff',
      "isActive" BOOLEAN      NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP   NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP   NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "AuditLog" (
      id         SERIAL PRIMARY KEY,
      "actorId"  INTEGER REFERENCES "User"(id),
      "actorEmail" VARCHAR(255),
      action     VARCHAR(100) NOT NULL,
      target     VARCHAR(255),
      detail     JSONB,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Bootstrap: if no users exist, create an admin from env vars.
 * ADMIN_EMAIL and ADMIN_PASSWORD must be set; ADMIN_NAME is optional.
 */
async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      "[Auth] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap."
    );
    return;
  }

  const pool = getPool();
  const existing = await pool.query('SELECT id FROM "User" LIMIT 1');
  if (existing.rows.length > 0) {
    return; // Users already exist; skip bootstrap.
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const name = process.env.ADMIN_NAME || "Admin";
  await pool.query(
    `INSERT INTO "User" (email, name, password, role) VALUES ($1, $2, $3, 'admin')`,
    [email.toLowerCase().trim(), name, hashed]
  );
  console.log(`[Auth] Admin account created for ${email}`);
}

/** Find a user by email (case-insensitive). Returns the full row or null. */
async function getUserByEmail(email) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM "User" WHERE LOWER(email) = LOWER($1) AND "isActive" = TRUE LIMIT 1`,
    [email.trim()]
  );
  return res.rows[0] || null;
}

/** Find a user by id. Returns the full row (including password) or null. */
async function getUserById(id) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM "User" WHERE id = $1 LIMIT 1`,
    [id]
  );
  return res.rows[0] || null;
}

/** List all users (admin only). Strips passwords. */
async function listUsers() {
  const pool = getPool();
  const res = await pool.query(
    `SELECT id, email, name, role, "isActive", "createdAt", "updatedAt"
     FROM "User" ORDER BY "createdAt" ASC`
  );
  return res.rows;
}

/**
 * Create a new user. Hashes the password before storing.
 * Returns the created user (without password).
 */
async function createUser({ email, name, password, role = "staff" }) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  const pool = getPool();
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const res = await pool.query(
    `INSERT INTO "User" (email, name, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, "isActive", "createdAt"`,
    [email.toLowerCase().trim(), name.trim(), hashed, role]
  );
  return res.rows[0];
}

/**
 * Update a user's role. Admins only.
 * Returns the updated user (without password) or null if not found.
 */
async function updateUserRole(userId, newRole) {
  if (!VALID_ROLES.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }
  const pool = getPool();
  const res = await pool.query(
    `UPDATE "User" SET role = $1, "updatedAt" = NOW()
     WHERE id = $2
     RETURNING id, email, name, role, "isActive", "updatedAt"`,
    [newRole, userId]
  );
  return res.rows[0] || null;
}

/**
 * Deactivate a user (soft-delete). Admins only.
 */
async function deactivateUser(userId) {
  const pool = getPool();
  const res = await pool.query(
    `UPDATE "User" SET "isActive" = FALSE, "updatedAt" = NOW()
     WHERE id = $1
     RETURNING id, email, name, role, "isActive"`,
    [userId]
  );
  return res.rows[0] || null;
}

/**
 * Verify a plain-text password against the stored hash.
 * Returns true if valid.
 */
async function verifyPassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

/**
 * Write an audit log entry. Non-fatal: logs a warning on failure.
 */
async function createAuditLog({ actorId, actorEmail, action, target, detail }) {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO "AuditLog" ("actorId", "actorEmail", action, target, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorId || null, actorEmail || null, action, target || null, detail ? JSON.stringify(detail) : null]
    );
  } catch (err) {
    console.warn("[AuditLog] Failed to write audit entry:", err.message);
  }
}

/**
 * List audit logs with pagination and optional action filtering. Admins only.
 */
async function listAuditLogs({ page = 1, limit = 20, action = null } = {}) {
  const pool = getPool();
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  let countQuery = 'SELECT COUNT(*)::int AS total FROM "AuditLog"';
  let dataQuery = `
    SELECT id, "actorId", "actorEmail", action, target, detail, "createdAt"
    FROM "AuditLog"
  `;
  const params = [];

  if (action && typeof action === "string" && action.trim() !== "" && action !== "ALL") {
    params.push(action.trim());
    countQuery += ` WHERE action = $1`;
    dataQuery += ` WHERE action = $1`;
  }

  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0]?.total || 0;

  const dataParams = [...params, safeLimit, offset];
  dataQuery += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const dataRes = await pool.query(dataQuery, dataParams);

  return {
    logs: dataRes.rows,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

module.exports = {
  VALID_ROLES,
  ensureUserTables,
  bootstrapAdmin,
  getUserByEmail,
  getUserById,
  listUsers,
  createUser,
  updateUserRole,
  deactivateUser,
  verifyPassword,
  createAuditLog,
  listAuditLogs,
};

