const dotenv = require("dotenv");
const { Pool } = require("pg");
const contract = require("../prisma/contract.json");

dotenv.config();

let db;
let pool;

async function connectDatabase() {
    const { default: postgres } = await import("@prisma/orm-postgres/runtime");

    db = postgres({
        url: process.env.DATABASE_URL,
        contract,
    });

    await db.connect();

    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    console.log("Prisma 8 PostgreSQL connected");
}

async function getOrderByNumber(orderNumber) {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    const res = await pool.query(
        'SELECT * FROM "Order" WHERE "orderNumber" = $1 LIMIT 1',
        [orderNumber]
    );
    return res.rows[0] || null;
}

async function closeDatabase() {
    if (db) {
        await db.close();
    }
    if (pool) {
        await pool.end();
    }
}

module.exports = {
    connectDatabase,
    getOrderByNumber,
    closeDatabase,
};