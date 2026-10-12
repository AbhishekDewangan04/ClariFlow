const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const TelegramBot = require("node-telegram-bot-api");
const { connectDatabase, getOrderByNumber, pingDatabase } = require("./dist/db");

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? (process.env.CORS_ORIGIN.trim() === "*" ? "*" : process.env.CORS_ORIGIN.split(",").map((s) => s.trim()))
  : undefined;
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

const isDirectExecution = require.main === module;

const bot = new TelegramBot(BOT_TOKEN, {
  polling: isDirectExecution && process.env.NODE_ENV !== "test",
});

let unauthorizedLogged = false;
bot.on("polling_error", (error) => {
  const msg = error.message || String(error);
  if (msg.includes("401") || msg.includes("Unauthorized")) {
    if (!unauthorizedLogged) {
      unauthorizedLogged = true;
      console.warn("Telegram BOT_TOKEN is unauthorized (401). Polling paused. Check BOT_TOKEN in .env or update via @BotFather.");
      bot.stopPolling().catch(() => {});
    }
    return;
  }
  console.warn("Telegram polling warning:", msg);
});

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

  // If in active session awaiting order number
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

    // If user typed /order <id> in response
    const cmdMatch = messageText.match(/^\/order(?:@\w+)?(?:\s+(.+))?$/i);
    if (cmdMatch && cmdMatch[1]) {
      return await queryAndReplyOrder(chatId, cmdMatch[1].trim(), botInstance);
    }

    // If message contains an explicit ORD-... pattern
    const patternMatch = messageText.match(/\b(ORD-[A-Za-z0-9-]+)\b/i);
    if (patternMatch) {
      return await queryAndReplyOrder(chatId, patternMatch[1].trim(), botInstance);
    }

    return await queryAndReplyOrder(chatId, messageText, botInstance);
  }

  // Check for cancellation
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

  // Check for greetings or help
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

  // Check for /order command with an order number (e.g. "/order ORD-TEST-200", "/order@bot ORD-8821")
  const orderCommandMatch = messageText.match(/^\/order(?:@\w+)?(?:\s+(.+))?$/i);
  if (orderCommandMatch) {
    const orderArg = orderCommandMatch[1]?.trim();
    if (orderArg) {
      chatSessions.delete(chatId);
      return await queryAndReplyOrder(chatId, orderArg, botInstance);
    }
    // Plain "/order" without arguments -> prompt for order number
    chatSessions.set(chatId, {
      awaitingOrderNumber: true,
      timestamp: Date.now(),
    });
    const reply = "Sure! I'd be happy to help you with your order. Could you please provide your order number?";
    botInstance.sendMessage(chatId, reply);
    return reply;
  }

  // Check for explicit order number pattern in message (e.g. "ORD-TEST-200", "ORD-8821", "ORD-4092", "where is ORD-TEST-200?")
  const orderIdPattern = /\b(ORD-[A-Za-z0-9-]+)\b/i;
  const orderIdMatch = messageText.match(orderIdPattern);
  if (orderIdMatch) {
    const extractedOrderNumber = orderIdMatch[1].trim();
    chatSessions.delete(chatId);
    return await queryAndReplyOrder(chatId, extractedOrderNumber, botInstance);
  }

  // Check if intent is general inquiry about order/tracking without an ID
  if (
    lowerText.includes("order") ||
    lowerText.includes("delivery") ||
    lowerText.includes("shipment") ||
    lowerText.includes("track")
  ) {
    chatSessions.set(chatId, {
      awaitingOrderNumber: true,
      timestamp: Date.now(),
    });
    const reply = "Sure! I'd be happy to help you with your order. Could you please provide your order number?";
    botInstance.sendMessage(chatId, reply);
    return reply;
  }

  // Fallback for unrelated messages
  const reply = "I'd be happy to help. Could you tell me a little more about what you need?";
  botInstance.sendMessage(chatId, reply);
  return reply;
}

bot.on("message", async (msg) => {
  await handleTelegramMessage(msg, bot);
});

app.get("/", (req, res) => {
  res.json({
    message: "ClariFlow Backend Running",
  });
});

app.get("/health", async (req, res) => {
  try {
    if (typeof pingDatabase === "function") {
      await pingDatabase();
    }
    return res.json({
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: "connected",
      bot: bot && typeof bot.isPolling === "function" && bot.isPolling() ? "polling" : "idle",
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

app.get("/api/orders/:orderNumber", async (req, res) => {
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

let server = null;

if (isDirectExecution) {
  server = app.listen(PORT, async () => {
    console.log(`ClariFlow Backend running on port ${PORT}`);

    try {
      await connectDatabase();
      console.log("Telegram bot started");
    } catch (error) {
      console.error("Database connection failed:", error);
      process.exit(1);
    }
  });
}

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

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { app, server, bot, handleTelegramMessage, chatSessions, queryAndReplyOrder };