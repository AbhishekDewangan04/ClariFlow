const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");
const { connectDatabase, getOrderByNumber, pingDatabase, getPool } = require("./dist/db");
const { requireAuth, requireRole, signToken, setAuthCookie, clearAuthCookie } = require("./src/auth");
const {
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
  VALID_ROLES,
} = require("./src/users");

const { rateLimit } = require("express-rate-limit");

dotenv.config();

// ─── PRODUCTION ENVIRONMENT VALIDATION ─────────────────────────────────────────
function validateProductionEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const missing = [];

  if (!process.env.BOT_TOKEN) missing.push("BOT_TOKEN");
  if (!process.env.DATABASE_URL && (!process.env.POSTGRES_USER || !process.env.POSTGRES_PASSWORD)) {
    missing.push("DATABASE_URL or (POSTGRES_USER and POSTGRES_PASSWORD)");
  }

  if (isProd) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      missing.push("JWT_SECRET (must be at least 32 characters in production)");
    }
    if (!process.env.CORS_ORIGIN || !process.env.CORS_ORIGIN.trim()) {
      missing.push("CORS_ORIGIN (explicit trusted domain required in production)");
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[Startup Validation Error] Missing or invalid production environment configuration:\n - ${missing.join("\n - ")}`;
    console.error(errorMsg);
    if (isProd) {
      throw new Error(errorMsg);
    }
  }
}

validateProductionEnv();

const app = express();
app.set("trust proxy", 1);

// ─── RATE LIMITING ─────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

// General auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 100 : 2000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication requests. Please try again later." },
});

// Strict login limiter against brute force attacks (5 per 15 min in production)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.RATE_LIMIT_LOGIN_MAX
    ? parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10)
    : (isProduction ? 5 : 2000),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes before trying again." },
});

// ─── CORS ────────────────────────────────────────────────────────────────────
// Credentials (cookies) require an explicit origin — "*" cannot be used.
const corsOriginRaw = process.env.CORS_ORIGIN;
let corsOptions;

if (corsOriginRaw) {
  const origins = corsOriginRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (origins.includes("*")) {
    throw new Error("CORS_ORIGIN cannot be '*' when credentials (cookies) are enabled.");
  }
  corsOptions = { origin: origins, credentials: true };
} else if (isProduction) {
  throw new Error("CORS_ORIGIN must be explicitly configured in production.");
} else {
  // Dev: allow Vite dev server and common local origins.
  corsOptions = {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:4173",
      "http://localhost",
    ],
    credentials: true,
  };
}
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

const isDirectExecution = require.main === module;

function shouldEnablePolling(env = process.env, isDirect = isDirectExecution) {
  if (!isDirect) return false;
  if (env.NODE_ENV === "test" || process.execArgv?.includes("--test")) return false;

  const pollingVal = String(env.TELEGRAM_POLLING || "").trim().toLowerCase();
  const botVal = String(env.ENABLE_TELEGRAM_BOT || "").trim().toLowerCase();

  if (pollingVal === "false" || pollingVal === "0" || botVal === "false" || botVal === "0") {
    return false;
  }
  return true;
}

const isPollingEnabled = shouldEnablePolling();

const botDiagnostics = {
  pollingEnabled: isPollingEnabled,
  conflictCount: 0,
  lastConflictAt: null,
  lastError: null,
};

function getBotStatus() {
  if (!isPollingEnabled) return "disabled";
  if (!bot || typeof bot.isPolling !== "function" || !bot.isPolling()) return "idle";
  const isRecentConflict =
    botDiagnostics.lastConflictAt &&
    Date.now() - new Date(botDiagnostics.lastConflictAt).getTime() < 45000;
  return isRecentConflict ? "conflict" : "polling";
}

const bot = new TelegramBot(BOT_TOKEN, {
  polling: isPollingEnabled,
  request: { family: 4 },
});

let unauthorizedLogged = false;

bot.on("polling_error", (error) => {
  const rawMsg = error.message || String(error);
  // Redact any accidental bot token disclosure
  const msg = rawMsg.replace(/bot[0-9]+:[A-Za-z0-9_-]+/g, "bot[REDACTED]");

  if (msg.includes("401") || msg.includes("Unauthorized")) {
    if (!unauthorizedLogged) {
      unauthorizedLogged = true;
      botDiagnostics.lastError = "401 Unauthorized: invalid bot token";
      console.warn("Telegram BOT_TOKEN is unauthorized (401). Polling paused. Check BOT_TOKEN in .env or update via @BotFather.");
      bot.stopPolling().catch(() => {});
    }
    return;
  }

  if (msg.includes("409") || msg.includes("Conflict")) {
    botDiagnostics.conflictCount++;
    botDiagnostics.lastConflictAt = new Date().toISOString();
    botDiagnostics.lastError = "409 Conflict: terminated by other getUpdates request";

    // Diagnostic logging without token or secrets
    // Log immediately on 1st, 5th, and every 25th conflict to inform operator without endless log spam
    if (
      botDiagnostics.conflictCount === 1 ||
      botDiagnostics.conflictCount === 5 ||
      botDiagnostics.conflictCount % 25 === 0
    ) {
      const isDocker = Boolean(
        process.env.DOCKER_CONTAINER ||
        process.env.IS_DOCKER ||
        (process.platform === "linux" && require("fs").existsSync("/.dockerenv"))
      );
      console.warn(
        `[Telegram 409 Conflict #${botDiagnostics.conflictCount}] Another poller is active with this bot token.\n` +
        `  Timestamp : ${botDiagnostics.lastConflictAt}\n` +
        `  Process   : PID ${process.pid} (Docker: ${isDocker})\n` +
        `  Diagnostic: Exactly one instance may poll Telegram getUpdates at a time.\n` +
        `  Action    : If running local dev while Docker container is up, set TELEGRAM_POLLING=false in root .env or backend/.env.`
      );
    }
    return;
  }

  botDiagnostics.lastError = msg;
  console.warn("Telegram polling warning:", msg);
});

// ─── TELEGRAM BOT LOGIC (unchanged) ──────────────────────────────────────────
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const chatSessions = new Map();

async function queryAndReplyOrder(chatId, orderNum, botInstance = bot) {
  const cleaned = (orderNum || "")
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/[.,!?]+$/, "")
    .trim();
  if (!cleaned || cleaned.length > 100) {
    const reply = "That order number seems invalid. Please provide a valid order number, or type 'cancel' to stop.";
    botInstance.sendMessage(chatId, reply);
    return reply;
  }

  try {
    const order = await getOrderByNumber(cleaned);
    if (order) {
      const reply = `📦 Order Details for ${order.orderNumber}:\n• Customer: ${order.customerName}\n• Status: ${order.status}\n• Total: $${Number(order.totalAmount).toFixed(2)}`;
      botInstance.sendMessage(chatId, reply);
      return reply;
    } else {
      const reply = `Sorry, no order was found with order number '${cleaned}'. Please check the number and try again, or type 'cancel' to stop.`;
      botInstance.sendMessage(chatId, reply);
      return reply;
    }
  } catch (err) {
    console.error("Error querying order for Telegram bot:", err.message || err);
    const reply = "Sorry, an error occurred while searching for your order. Please try again later.";
    botInstance.sendMessage(chatId, reply);
    return reply;
  }
}

async function handleTelegramMessage(msg, botInstance = bot) {
  if (!msg || !msg.text) return null;

  const chatId = msg.chat?.id;
  if (!chatId) return null;

  const messageText = msg.text.trim();
  const lowerText = messageText.toLowerCase();

  const session = chatSessions.get(chatId);
  if (session && Date.now() - session.timestamp > SESSION_TIMEOUT_MS) {
    chatSessions.delete(chatId);
  }

  const activeSession = chatSessions.get(chatId);

  if (activeSession && activeSession.awaitingOrderNumber) {
    if (
      lowerText === "cancel" ||
      lowerText === "stop" ||
      lowerText === "nevermind" ||
      lowerText === "exit" ||
      /^\/cancel(?:@\w+)?$/i.test(messageText)
    ) {
      chatSessions.delete(chatId);
      const reply = "Order tracking cancelled. How else can I help you today?";
      botInstance.sendMessage(chatId, reply);
      return reply;
    }

    if (
      lowerText === "hi" ||
      lowerText === "hello" ||
      lowerText === "hey" ||
      lowerText.includes("good morning") ||
      lowerText.includes("good evening") ||
      /^\/(?:start|help)(?:@\w+)?$/i.test(messageText) ||
      lowerText === "help"
    ) {
      chatSessions.delete(chatId);
      const reply = "Hello! 👋 I'm ClariFlow. You can track your orders by typing your order number (e.g. ORD-TEST-200) or using /order <number>.";
      botInstance.sendMessage(chatId, reply);
      return reply;
    }

    chatSessions.delete(chatId);

    const cmdMatch = messageText.match(/^\/order(?:@\w+)?(?:\s+(.+))?$/i);
    if (cmdMatch && cmdMatch[1]) {
      return await queryAndReplyOrder(chatId, cmdMatch[1].trim(), botInstance);
    }

    const patternMatch = messageText.match(/\b(ORD-[A-Za-z0-9-]+)\b/i);
    if (patternMatch) {
      return await queryAndReplyOrder(chatId, patternMatch[1].trim(), botInstance);
    }

    return await queryAndReplyOrder(chatId, messageText, botInstance);
  }

  if (
    lowerText === "cancel" ||
    lowerText === "stop" ||
    lowerText === "nevermind" ||
    lowerText === "exit" ||
    /^\/cancel(?:@\w+)?$/i.test(messageText)
  ) {
    chatSessions.delete(chatId);
    const reply = "Order tracking cancelled. How else can I help you today?";
    botInstance.sendMessage(chatId, reply);
    return reply;
  }

  if (
    lowerText === "hi" ||
    lowerText === "hello" ||
    lowerText === "hey" ||
    lowerText.includes("good morning") ||
    lowerText.includes("good evening") ||
    /^\/(?:start|help)(?:@\w+)?$/i.test(messageText) ||
    lowerText === "help"
  ) {
    const reply = "Hello! 👋 I'm ClariFlow. You can track your orders by typing your order number (e.g. ORD-TEST-200) or using /order <number>.";
    botInstance.sendMessage(chatId, reply);
    return reply;
  }

  const orderCommandMatch = messageText.match(/^\/order(?:@\w+)?(?:\s+(.+))?$/i);
  if (orderCommandMatch) {
    const orderArg = orderCommandMatch[1]?.trim();
    if (orderArg) {
      chatSessions.delete(chatId);
      return await queryAndReplyOrder(chatId, orderArg, botInstance);
    }
    chatSessions.set(chatId, { awaitingOrderNumber: true, timestamp: Date.now() });
    const reply = "Sure! I'd be happy to help you with your order. Could you please provide your order number?";
    botInstance.sendMessage(chatId, reply);
    return reply;
  }

  const orderIdPattern = /\b(ORD-[A-Za-z0-9-]+)\b/i;
  const orderIdMatch = messageText.match(orderIdPattern);
  if (orderIdMatch) {
    const extractedOrderNumber = orderIdMatch[1].trim();
    chatSessions.delete(chatId);
    return await queryAndReplyOrder(chatId, extractedOrderNumber, botInstance);
  }

  if (
    lowerText.includes("order") ||
    lowerText.includes("delivery") ||
    lowerText.includes("shipment") ||
    lowerText.includes("track")
  ) {
    chatSessions.set(chatId, { awaitingOrderNumber: true, timestamp: Date.now() });
    const reply = "Sure! I'd be happy to help you with your order. Could you please provide your order number?";
    botInstance.sendMessage(chatId, reply);
    return reply;
  }

  const reply = "I'd be happy to help. Could you tell me a little more about what you need?";
  botInstance.sendMessage(chatId, reply);
  return reply;
}

bot.on("message", async (msg) => {
  await handleTelegramMessage(msg, bot);
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ message: "ClariFlow Backend Running" });
});

app.get("/health", async (req, res) => {
  try {
    if (typeof pingDatabase === "function") {
      await pingDatabase();
    }
    const currentBotStatus = getBotStatus();
    return res.json({
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: "connected",
      bot: currentBotStatus,
      botDiagnostics: {
        pollingEnabled: isPollingEnabled,
        status: currentBotStatus,
        conflictCount: botDiagnostics.conflictCount,
        lastConflictAt: botDiagnostics.lastConflictAt,
        lastError: botDiagnostics.lastError,
      },
    });
  } catch (err) {
    return res.status(503).json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: err.message || "Database connection check failed",
    });
  }
});

/** Protected: order lookup requires authentication to protect customer and business data */
app.get("/api/orders/:orderNumber", requireAuth, async (req, res) => {
  try {
    const rawOrderNumber = req.params.orderNumber;
    if (!rawOrderNumber || typeof rawOrderNumber !== "string") {
      return res.status(400).json({ error: "Invalid order number" });
    }

    const orderNumber = rawOrderNumber.trim();
    if (!orderNumber || orderNumber.length > 100) {
      return res.status(400).json({ error: "Invalid order number" });
    }

    const order = await getOrderByNumber(orderNumber);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching order via API:", error.message || error);
    const isConnError =
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.name === "AggregateError" ||
      (Array.isArray(error.errors) && error.errors.some((e) => e.code === "ECONNREFUSED" || e.code === "ETIMEDOUT"));

    if (isConnError) {
      return res.status(503).json({ error: "Database unavailable" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

/** POST /api/auth/login  — { email, password } → sets cf_token cookie */
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await getUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = signToken(payload);
    setAuthCookie(res, token);

    await createAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "login",
      target: null,
      detail: null,
    });

    return res.json({ user: payload });
  } catch (err) {
    console.error("Login error:", err.message || err);
    return res.status(500).json({ error: "Login failed." });
  }
});

/** POST /api/auth/logout — clears the cookie */
app.post("/api/auth/logout", authLimiter, async (req, res) => {
  const token = req.cookies?.["cf_token"];
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }
  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.decode(token);
    if (decoded && decoded.id) {
      await createAuditLog({
        actorId: decoded.id,
        actorEmail: decoded.email,
        action: "logout",
        target: null,
        detail: null,
      });
    }
  } catch {}
  clearAuthCookie(res);
  return res.json({ message: "Logged out." });
});

/** GET /api/auth/me — returns the current user from the cookie */
app.get("/api/auth/me", authLimiter, requireAuth, async (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name,
    },
  });
});

/** PATCH /api/auth/profile — update current user's display name */
app.patch("/api/auth/profile", authLimiter, requireAuth, async (req, res) => {
  try {
    const { name } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }

    const trimmed = name.trim();
    if (trimmed.length > 100) {
      return res.status(400).json({ error: "Name cannot exceed 100 characters." });
    }

    // Role, email, and ID modification are strictly disallowed
    if (req.body.role !== undefined && req.body.role !== req.user.role) {
      return res.status(403).json({ error: "You cannot change your own role." });
    }

    const updated = await updateUserName(req.user.id, trimmed);
    if (!updated) {
      return res.status(404).json({ error: "User not found." });
    }

    // Update JWT cookie with new name so subsequent requests have the updated payload
    const payload = {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      name: updated.name,
    };
    const token = signToken(payload);
    setAuthCookie(res, token);

    await createAuditLog({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: "user.profile_update",
      target: updated.email,
      detail: { newName: updated.name },
    });

    return res.json({ user: payload });
  } catch (err) {
    console.error("Profile update error:", err.message || err);
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

// ─── ORDER MUTATION — STATUS UPDATE ──────────────────────────────────────────

/**
 * Allowed status transitions per role:
 *  staff:   PROCESSING → SHIPPED only
 *  manager: any forward transition + CANCELLED (from non-DELIVERED)
 *  admin:   any valid transition
 *
 * Valid statuses: PROCESSING, SHIPPED, DELIVERED, CANCELLED, IN_TRANSIT
 */
const VALID_STATUSES = ["PROCESSING", "IN_TRANSIT", "SHIPPED", "DELIVERED", "CANCELLED"];

function isTransitionAllowed(role, fromStatus, toStatus) {
  const from = (fromStatus || "").toUpperCase();
  const to = (toStatus || "").toUpperCase();

  if (!VALID_STATUSES.includes(to)) return false;

  if (role === "admin") return true;

  // Cannot change a DELIVERED order (except admin).
  if (from === "DELIVERED") return false;

  // CANCELLED is allowed for manager and admin from any non-DELIVERED state.
  if (to === "CANCELLED") {
    return role === "manager";
  }

  // Staff: only PROCESSING → SHIPPED (or IN_TRANSIT → SHIPPED as equivalent).
  if (role === "staff") {
    return (from === "PROCESSING" || from === "IN_TRANSIT") && to === "SHIPPED";
  }

  // Manager: any forward transition except CANCELLED is already handled.
  if (role === "manager") {
    const order = ["PROCESSING", "IN_TRANSIT", "SHIPPED", "DELIVERED"];
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    return fromIdx !== -1 && toIdx > fromIdx;
  }

  return false;
}

/**
 * PATCH /api/orders/:orderNumber/status
 * Body: { status: "SHIPPED" }
 * Auth: any authenticated user; role controls which transitions are allowed.
 */
app.patch("/api/orders/:orderNumber/status", requireAuth, async (req, res) => {
  try {
    const rawOrderNumber = req.params.orderNumber;
    if (!rawOrderNumber || typeof rawOrderNumber !== "string") {
      return res.status(400).json({ error: "Invalid order number." });
    }

    const orderNumber = rawOrderNumber.trim();
    if (!orderNumber || orderNumber.length > 100) {
      return res.status(400).json({ error: "Invalid order number." });
    }

    const { status: newStatus } = req.body || {};
    if (!newStatus || typeof newStatus !== "string") {
      return res.status(400).json({ error: "status field is required." });
    }

    const sanitizedStatus = newStatus.trim().toUpperCase();
    if (!VALID_STATUSES.includes(sanitizedStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.`,
      });
    }

    const pool = getPool();

    // Fetch current order within a transaction for safe read-then-write.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const orderRes = await client.query(
        'SELECT * FROM "Order" WHERE UPPER("orderNumber") = UPPER($1) FOR UPDATE',
        [orderNumber]
      );
      const order = orderRes.rows[0];

      if (!order) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Order not found." });
      }

      const currentStatus = (order.status || "").toUpperCase();
      if (currentStatus === sanitizedStatus) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Order is already in that status." });
      }

      if (!isTransitionAllowed(req.user.role, currentStatus, sanitizedStatus)) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: `Your role (${req.user.role}) cannot change status from ${currentStatus} to ${sanitizedStatus}.`,
        });
      }

      await client.query(
        `UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
        [sanitizedStatus, order.id]
      );

      await client.query("COMMIT");

      // Audit log (non-fatal, outside the transaction).
      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "order.status_update",
        target: order.orderNumber,
        detail: { from: currentStatus, to: sanitizedStatus },
      });

      return res.json({
        orderNumber: order.orderNumber,
        status: sanitizedStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.email,
      });
    } catch (innerErr) {
      await client.query("ROLLBACK");
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Status update error:", err.message || err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ─── ADMIN — USER MANAGEMENT ──────────────────────────────────────────────────

/** GET /api/admin/users — list all users (admin only) */
app.get("/api/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const users = await listUsers();
    return res.json({ users });
  } catch (err) {
    console.error("List users error:", err.message || err);
    return res.status(500).json({ error: "Failed to list users." });
  }
});

/** POST /api/admin/users — create a new team member (admin only) */
app.post("/api/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { email, name, password, role } = req.body || {};

    if (!email || !name || !password || typeof email !== "string" || typeof name !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "email, name, and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const resolvedRole = (role && VALID_ROLES.includes(role)) ? role : "staff";

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "A user with that email already exists." });
    }

    const newUser = await createUser({ email, name, password, role: resolvedRole });

    await createAuditLog({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: "user.created",
      target: newUser.email,
      detail: { role: resolvedRole },
    });

    return res.status(201).json({ user: newUser });
  } catch (err) {
    console.error("Create user error:", err.message || err);
    if (err.message && err.message.includes("duplicate key")) {
      return res.status(409).json({ error: "A user with that email already exists." });
    }
    return res.status(500).json({ error: "Failed to create user." });
  }
});

/** PATCH /api/admin/users/:id/role — change a user's role (admin only) */
app.patch("/api/admin/users/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const { role } = req.body || {};
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}.` });
    }

    // Prevent admins from demoting themselves.
    if (userId === req.user.id && role !== "admin") {
      return res.status(400).json({ error: "You cannot change your own role." });
    }

    const updated = await updateUserRole(userId, role);
    if (!updated) {
      return res.status(404).json({ error: "User not found." });
    }

    await createAuditLog({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: "user.role_changed",
      target: updated.email,
      detail: { newRole: role },
    });

    return res.json({ user: updated });
  } catch (err) {
    console.error("Role update error:", err.message || err);
    return res.status(500).json({ error: "Failed to update role." });
  }
});

/** DELETE /api/admin/users/:id — deactivate a user (admin only) */
app.delete("/api/admin/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: "You cannot deactivate yourself." });
    }

    const deactivated = await deactivateUser(userId);
    if (!deactivated) {
      return res.status(404).json({ error: "User not found." });
    }

    await createAuditLog({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: "user.deactivated",
      target: deactivated.email,
      detail: null,
    });

    return res.json({ user: deactivated });
  } catch (err) {
    console.error("Deactivate user error:", err.message || err);
    return res.status(500).json({ error: "Failed to deactivate user." });
  }
});

/** GET /api/admin/audit-logs — list audit logs with pagination (admin only) */
app.get("/api/admin/audit-logs", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { page, limit, action } = req.query || {};
    const result = await listAuditLogs({ page, limit, action });
    return res.json(result);
  } catch (err) {
    console.error("List audit logs error:", err.message || err);
    return res.status(500).json({ error: "Failed to list audit logs." });
  }
});

// ─── JSON ERROR HANDLER ───────────────────────────────────────────────────────
// Express 5 renders unhandled errors as HTML by default. This ensures all
// API errors are always JSON — critical for the test suite and API clients.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message =
    status === 400 && err.type === "entity.parse.failed"
      ? "Request body is not valid JSON."
      : err.message || "Internal server error";
  console.error(`[Error] ${req.method} ${req.path} → ${status}: ${message}`);
  res.status(status).json({ error: message });
});

// ─── SERVER STARTUP ────────────────────────────────────────────────────────────

let server = null;

if (isDirectExecution) {
  server = app.listen(PORT, async () => {
    console.log(`ClariFlow Backend running on port ${PORT}`);

    try {
      await connectDatabase();
      await ensureUserTables();
      await bootstrapAdmin();
      if (isPollingEnabled) {
        console.log("Telegram bot started (polling enabled)");
      } else {
        console.log("Telegram bot initialized (polling disabled via TELEGRAM_POLLING=false)");
      }
    } catch (error) {
      console.error("Database connection failed:", error);
      process.exit(1);
    }
  });
}

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  try {
    if (bot && typeof bot.isPolling === "function" && bot.isPolling()) {
      await bot.stopPolling();
      console.log("Telegram bot polling stopped.");
    }
  } catch (err) {
    console.warn("Error stopping bot polling:", err.message || err);
  }

  try {
    const { closeDatabase } = require("./dist/db");
    await closeDatabase();
    console.log("Database connection closed.");
  } catch (err) {
    console.warn("Error closing database:", err.message || err);
  }

  if (server && typeof server.close === "function") {
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    console.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = {
  app,
  server,
  bot,
  handleTelegramMessage,
  chatSessions,
  queryAndReplyOrder,
  shouldEnablePolling,
  botDiagnostics,
  getBotStatus,
};