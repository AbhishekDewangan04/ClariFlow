import * as path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

function getDatabaseUrl(): string {
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

let db: any;
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const dbUrl = getDatabaseUrl();
    const isCloudSsl = dbUrl.includes("sslmode=require") || process.env.DATABASE_SSL === "true";
    pool = new Pool({
      connectionString: dbUrl,
      ssl: isCloudSsl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
    pool.on("error", (err) => {
      console.warn("Unexpected PostgreSQL client error:", err.message || err);
    });
  }
  return pool;
}

export async function connectDatabase() {
  const contract = require("../prisma/contract.json");
  const { default: postgres } = await import("@prisma/orm-postgres/runtime");

  const dbUrl = getDatabaseUrl();

  db = postgres({
    binding: { kind: "url", url: dbUrl },
    contract,
  });

  await db.connect();

  const activePool = getPool();
  try {
    const client = await activePool.connect();
    await client.query("SELECT 1");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Product" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        stock INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
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
    `);
    client.release();
    console.log("Prisma 8 PostgreSQL connected and schema verified");
  } catch (err: any) {
    console.warn("Warning: Initial PostgreSQL ping failed:", err.message || err);
  }
}

export async function pingDatabase(): Promise<boolean> {
  const activePool = getPool();
  await activePool.query("SELECT 1");
  return true;
}

export async function getOrderByNumber(orderNumber: string) {
  if (!orderNumber || typeof orderNumber !== "string") {
    return null;
  }
  const trimmed = orderNumber.trim();
  if (!trimmed) {
    return null;
  }
  const activePool = getPool();
  const res = await activePool.query(
    'SELECT * FROM "Order" WHERE UPPER("orderNumber") = UPPER($1) LIMIT 1',
    [trimmed]
  );
  return res.rows[0] || null;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}
