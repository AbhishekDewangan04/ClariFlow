const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const zlib = require("node:zlib");
const { execSync } = require("node:child_process");
const dotenv = require("dotenv");
const { Pool } = require("pg");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
dotenv.config({ path: path.resolve(PROJECT_ROOT, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BACKUP_DIR = path.resolve(PROJECT_ROOT, "backups");
const TEST_DB_NAME = "clariflow_recovery_test";
const PROD_CONTAINER = "clariflow-postgres-prod";
const PG_USER = "clariflow";

function getDatabaseUrl(dbName) {
  if (process.env.DATABASE_URL) {
    const parsed = new URL(process.env.DATABASE_URL);
    parsed.pathname = `/${dbName}`;
    return parsed.toString();
  }
  const user = process.env.POSTGRES_USER || "clariflow";
  const password = process.env.POSTGRES_PASSWORD || "DOVNGXKLWEMDIYJXFZZZXTLOPIGVQKAT";
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(dbName)}`;
}

test("Database Backup and Recovery Suite", async (t) => {
  let createdBackupFile = null;

  await t.test("Step 1: Execute automated backup via PowerShell / Docker exec", async () => {
    assert.ok(fs.existsSync(BACKUP_DIR), "Backups directory should exist");

    // Run backup.ps1
    const backupScript = path.resolve(PROJECT_ROOT, "scripts/backup.ps1");
    const cmd = `pwsh -NoProfile -ExecutionPolicy Bypass -File "${backupScript}" -BackupDir "${BACKUP_DIR}" -Compress -NoPrune`;
    
    const output = execSync(cmd, { encoding: "utf8" });
    assert.ok(output.includes("Backup completed successfully"), `Expected success in output, got: ${output}`);

    // Find the newest backup file created
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("clariflow_backup_") && f.endsWith(".sql.gz"))
      .map((f) => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    assert.ok(files.length > 0, "At least one backup file should exist");
    createdBackupFile = path.join(BACKUP_DIR, files[0].name);

    assert.ok(fs.existsSync(createdBackupFile), "Created backup file must exist on disk");
    const stat = fs.statSync(createdBackupFile);
    assert.ok(stat.size > 100, `Backup file must be non-empty (got ${stat.size} bytes)`);

    // Verify gzip archive header and decompressibility
    const compressedBuffer = fs.readFileSync(createdBackupFile);
    const decompressed = zlib.gunzipSync(compressedBuffer).toString("utf8");
    assert.ok(decompressed.includes("CREATE TABLE"), "Decompressed SQL dump must contain DDL statements");
    assert.ok(decompressed.includes('"Order"'), "Decompressed SQL dump must reference Order table");
  });

  await t.test("Step 2: Create isolated test database (zero production impact)", async () => {
    // Drop test database if already lingering
    execSync(
      `docker exec ${PROD_CONTAINER} psql -U ${PG_USER} -d postgres -c "DROP DATABASE IF EXISTS \\"${TEST_DB_NAME}\\";"`,
      { encoding: "utf8" }
    );
    // Create fresh isolated test database
    const createOut = execSync(
      `docker exec ${PROD_CONTAINER} psql -U ${PG_USER} -d postgres -c "CREATE DATABASE \\"${TEST_DB_NAME}\\" OWNER ${PG_USER};"`,
      { encoding: "utf8" }
    );
    assert.ok(createOut.includes("CREATE DATABASE"), `Expected CREATE DATABASE, got: ${createOut}`);
  });

  await t.test("Step 3: Restore backup into isolated test database via rollback script", async () => {
    assert.ok(createdBackupFile && fs.existsSync(createdBackupFile), "Backup file required for restore");

    const rollbackScript = path.resolve(PROJECT_ROOT, "scripts/rollback.ps1");
    const cmd = `pwsh -NoProfile -ExecutionPolicy Bypass -File "${rollbackScript}" -BackupFile "${createdBackupFile}" -PostgresDb "${TEST_DB_NAME}" -Force`;

    const output = execSync(cmd, { encoding: "utf8" });
    assert.ok(
      output.includes("Database restore into") && output.includes("completed successfully"),
      `Expected restore success, got: ${output}`
    );
  });

  await t.test("Step 4: Verify schema, tables, and seeded data in isolated test database", async () => {
    const testPool = new Pool({ connectionString: getDatabaseUrl(TEST_DB_NAME) });
    try {
      // 1. Verify tables
      const tableRes = await testPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      const tableNames = tableRes.rows.map((r) => r.table_name);
      assert.ok(tableNames.includes("Product"), "Product table must exist in restored database");
      assert.ok(tableNames.includes("Order"), "Order table must exist in restored database");
      assert.ok(tableNames.includes("User"), "User table must exist in restored database");
      assert.ok(tableNames.includes("AuditLog"), "AuditLog table must exist in restored database");

      // 2. Verify seeded products
      const prodRes = await testPool.query('SELECT count(*)::int AS count FROM "Product"');
      assert.ok(prodRes.rows[0].count >= 3, "Product count should be >= 3");

      // 3. Verify seeded orders
      const orderRes = await testPool.query('SELECT count(*)::int AS count FROM "Order"');
      assert.ok(orderRes.rows[0].count >= 3, "Order count should be >= 3");

      // 4. Verify specific verified orders
      const alexOrder = await testPool.query('SELECT * FROM "Order" WHERE "orderNumber" = $1', ["ORD-TEST-200"]);
      assert.equal(alexOrder.rows.length, 1, "ORD-TEST-200 must exist");
      assert.equal(alexOrder.rows[0].customerName, "Alex Rivera");
      assert.equal(alexOrder.rows[0].status, "DELIVERED");
      assert.equal(Number(alexOrder.rows[0].totalAmount), 200);

      const sarahOrder = await testPool.query('SELECT * FROM "Order" WHERE "orderNumber" = $1', ["ORD-8821"]);
      assert.equal(sarahOrder.rows.length, 1, "ORD-8821 must exist");
      assert.equal(sarahOrder.rows[0].customerName, "Sarah Chen");

      const marcusOrder = await testPool.query('SELECT * FROM "Order" WHERE "orderNumber" = $1', ["ORD-4092"]);
      assert.equal(marcusOrder.rows.length, 1, "ORD-4092 must exist");
      assert.equal(marcusOrder.rows[0].customerName, "Marcus Vance");
    } finally {
      await testPool.end();
    }
  });

  await t.test("Step 5: Clean up isolated test database", async () => {
    // Terminate any active connections and drop the isolated test database
    execSync(
      `docker exec ${PROD_CONTAINER} psql -U ${PG_USER} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid();"`,
      { encoding: "utf8" }
    );
    const dropOut = execSync(
      `docker exec ${PROD_CONTAINER} psql -U ${PG_USER} -d postgres -c "DROP DATABASE IF EXISTS \\"${TEST_DB_NAME}\\";"`,
      { encoding: "utf8" }
    );
    assert.ok(dropOut.includes("DROP DATABASE"), `Expected DROP DATABASE, got: ${dropOut}`);
  });

  await t.test("Step 6: Retention policy verification (prunes older than retention window)", async () => {
    // Create an artificial old backup file dated 30 days ago
    const oldTimestamp = "20200101_000000";
    const dummyOldFile = path.join(BACKUP_DIR, `clariflow_backup_${oldTimestamp}.sql.gz`);
    fs.writeFileSync(dummyOldFile, "DUMMY_OLD_BACKUP_CONTENT");

    // Set mtime to 30 days in the past
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    fs.utimesSync(dummyOldFile, thirtyDaysAgo, thirtyDaysAgo);
    assert.ok(fs.existsSync(dummyOldFile), "Dummy old backup file should exist before pruning");

    // Run backup.ps1 with RetentionDays = 14
    const backupScript = path.resolve(PROJECT_ROOT, "scripts/backup.ps1");
    const cmd = `pwsh -NoProfile -ExecutionPolicy Bypass -File "${backupScript}" -BackupDir "${BACKUP_DIR}" -RetentionDays 14`;
    execSync(cmd, { encoding: "utf8" });

    // Verify dummy old file was pruned
    assert.ok(!fs.existsSync(dummyOldFile), "Old backup file (>14 days) must be pruned by retention policy");

    // Verify the recent backup file was preserved
    if (createdBackupFile) {
      assert.ok(fs.existsSync(createdBackupFile), "Recent backup file must be preserved");
    }
  });
});
