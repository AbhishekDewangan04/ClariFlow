/**
 * repair-admin.js
 *
 * Safe admin account repair script for ClariFlow.
 * Creates or resets the password/active status of the administrator specified
 * by ADMIN_EMAIL and ADMIN_PASSWORD in environment variables (or root/backend .env).
 *
 * Security:
 * - Uses bcrypt with SALT_ROUNDS = 12 (identical to server.js / users.js).
 * - Never prints or leaks raw passwords, hashes, JWT secrets, or tokens.
 * - Non-destructive: does not delete or reset other users, orders, or database volumes.
 */

const path = require("path");
const dotenv = require("dotenv");

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

const { repairAdmin } = require("../src/users");
const { closeDatabase } = require("../src/db");

async function run() {
  try {
    const result = await repairAdmin();
    console.log(
      `[Success] Admin account successfully ${result.action} for ${result.user.email} (Role: ${result.user.role}, Active: ${result.user.isActive})`
    );
  } catch (err) {
    console.error("[Error] Failed to repair admin:", err.message);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
