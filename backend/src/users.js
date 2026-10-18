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
 * Bootstrap: ensure an active admin account exists for the configured ADMIN_EMAIL.
 * If user does not exist, creates it. If deactivated or demoted, reactivates and restores admin role.
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
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await pool.query(
    'SELECT id, password, "isActive", role FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [normalizedEmail]
  );

  const name = process.env.ADMIN_NAME || "Admin";

  if (existing.rows.length === 0) {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      `INSERT INTO "User" (email, name, password, role, "isActive") VALUES ($1, $2, $3, 'admin', TRUE)`,
      [normalizedEmail, name, hashed]
    );
    console.log(`[Auth] Admin account created for ${normalizedEmail}`);
  } else {
    const adminUser = existing.rows[0];
    const passwordMatches = await bcrypt.compare(password, adminUser.password);
    if (!passwordMatches || !adminUser.isActive || adminUser.role !== "admin") {
      const hashed = passwordMatches ? adminUser.password : await bcrypt.hash(password, SALT_ROUNDS);
      await pool.query(
        `UPDATE "User" SET password = $1, "isActive" = TRUE, role = 'admin', "updatedAt" = NOW() WHERE id = $2`,
        [hashed, adminUser.id]
      );
      console.log(`[Auth] Admin account status and credentials synchronized for ${normalizedEmail}`);
    }
  }
}

/**
 * Safely create or repair the admin user using the specified or environment credentials.
 * Ensures the password uses bcrypt with SALT_ROUNDS, role is 'admin', and isActive is true.
 * Never logs or exposes passwords, hashes, JWT secrets, cookies, or tokens.
 */
async function repairAdmin({ email, password, name } = {}) {
  const targetEmail = (email || process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const targetPassword = password || process.env.ADMIN_PASSWORD;
  const targetName = (name || process.env.ADMIN_NAME || "Admin").trim();

  if (!targetEmail || !targetPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be provided or set in environment.");
  }

  const pool = getPool();
  await ensureUserTables();
  const hashed = await bcrypt.hash(targetPassword, SALT_ROUNDS);

  const existing = await pool.query(
    'SELECT id FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [targetEmail]
  );

  if (existing.rows.length === 0) {
    const res = await pool.query(
      `INSERT INTO "User" (email, name, password, role, "isActive")
       VALUES ($1, $2, $3, 'admin', TRUE)
       RETURNING id, email, name, role, "isActive"`,
      [targetEmail, targetName, hashed]
    );
    return { action: "created", user: res.rows[0] };
  } else {
    const res = await pool.query(
      `UPDATE "User"
       SET password = $1, name = $2, role = 'admin', "isActive" = TRUE, "updatedAt" = NOW()
       WHERE id = $3
       RETURNING id, email, name, role, "isActive"`,
      [hashed, targetName, existing.rows[0].id]
    );
    return { action: "repaired", user: res.rows[0] };
  }
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
 * Update a user's display name.
 * Returns the updated user (without password) or null if not found.
 */
async function updateUserName(userId, name) {
  const pool = getPool();
  const res = await pool.query(
    `UPDATE "User" SET name = $1, "updatedAt" = NOW()
     WHERE id = $2
     RETURNING id, email, name, role, "isActive", "updatedAt"`,
    [name.trim(), userId]
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
  updateUserName,
  deactivateUser,
  verifyPassword,
  createAuditLog,
  listAuditLogs,
  repairAdmin,
};

