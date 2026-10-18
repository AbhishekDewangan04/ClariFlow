const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, ".env") });
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const user = process.env.POSTGRES_USER || "clariflow";
  const password = process.env.POSTGRES_PASSWORD || "clariflow_password";
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const dbName = process.env.POSTGRES_DB || "clariflow";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(dbName)}`;
}

const DATABASE_URL = getDatabaseUrl();

async function seed() {
  const isCloudSsl = DATABASE_URL.includes("sslmode=require") || process.env.DATABASE_SSL === "true";
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isCloudSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log("Connecting to PostgreSQL to seed data...");
    
    // Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Product" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        stock INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Order" (
        id SERIAL PRIMARY KEY,
        "orderNumber" VARCHAR(100) UNIQUE NOT NULL,
        "customerName" VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        "totalAmount" NUMERIC(10, 2) NOT NULL,
        "productId" INTEGER REFERENCES "Product"(id),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

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

    // Seed product if not exists
    const prodRes = await pool.query(`
      INSERT INTO "Product" (name, description, price, stock, "updatedAt")
      VALUES ('Smart Hub Pro', 'Home automation controller', 200.00, 25, NOW())
      RETURNING id;
    `).catch(async () => {
      const existing = await pool.query('SELECT id FROM "Product" LIMIT 1;');
      return existing;
    });

    const productId = prodRes.rows[0]?.id || null;

    // Seed test order ORD-TEST-200
    await pool.query(`
      INSERT INTO "Order" ("orderNumber", "customerName", status, "totalAmount", "productId", "createdAt", "updatedAt")
      VALUES ('ORD-TEST-200', 'Alex Rivera', 'DELIVERED', 200.00, $1, NOW() - INTERVAL '2 days', NOW())
      ON CONFLICT ("orderNumber") DO UPDATE
      SET "customerName" = EXCLUDED."customerName",
          status = EXCLUDED.status,
          "totalAmount" = EXCLUDED."totalAmount",
          "updatedAt" = NOW();
    `, [productId]);

    // Also seed documented demo orders for testing
    await pool.query(`
      INSERT INTO "Order" ("orderNumber", "customerName", status, "totalAmount", "productId", "createdAt", "updatedAt")
      VALUES 
        ('ORD-8821', 'Sarah Chen', 'IN_TRANSIT', 349.50, $1, NOW() - INTERVAL '1 day', NOW()),
        ('ORD-4092', 'Marcus Vance', 'PROCESSING', 89.99, $1, NOW() - INTERVAL '3 hours', NOW())
      ON CONFLICT ("orderNumber") DO UPDATE
      SET "customerName" = EXCLUDED."customerName",
          status = EXCLUDED.status,
          "totalAmount" = EXCLUDED."totalAmount",
          "updatedAt" = NOW();
    `, [productId]);

    // Seed admin user if configured
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Admin";

    if (adminEmail && adminPassword) {
      const bcrypt = require("bcrypt");
      const normalizedEmail = adminEmail.toLowerCase().trim();
      const existingUser = await pool.query(
        'SELECT id, "isActive", role FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [normalizedEmail]
      );
      if (existingUser.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        await pool.query(
          `INSERT INTO "User" (email, name, password, role, "isActive") VALUES ($1, $2, $3, 'admin', TRUE)`,
          [normalizedEmail, adminName, hashedPassword]
        );
        console.log(`Successfully seeded admin user for ${normalizedEmail}`);
      } else {
        const user = existingUser.rows[0];
        if (!user.isActive || user.role !== "admin") {
          await pool.query(
            `UPDATE "User" SET "isActive" = TRUE, role = 'admin', "updatedAt" = NOW() WHERE id = $1`,
            [user.id]
          );
          console.log(`Restored active admin status for ${normalizedEmail}`);
        }
      }
    }

    console.log("Successfully seeded database with ORD-TEST-200 and demo orders!");
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
