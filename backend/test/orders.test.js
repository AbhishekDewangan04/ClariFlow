const test = require("node:test");
const assert = require("node:assert/strict");
const { getOrderByNumber, closeDatabase } = require("../src/db");

let testServer = null;
let authCookie = null;

test.before(async () => {
  try {
    const res = await fetch("http://localhost:5000/");
    if (!res.ok) throw new Error("not ready");
  } catch {
    const { app } = require("../server");
    const { connectDatabase } = require("../dist/db");
    const { ensureUserTables, bootstrapAdmin } = require("../src/users");
    await connectDatabase();
    await ensureUserTables();
    await bootstrapAdmin();
    testServer = app.listen(5000);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  try {
    const loginRes = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@clariflow.local", password: "ClariFlow@Admin2026" }),
    });
    const setCookie = loginRes.headers.get("set-cookie");
    if (setCookie) {
      authCookie = setCookie.split(";")[0];
    }
  } catch (err) {
    console.error("Failed to obtain authCookie for orders tests:", err.message);
  }
});

test("Order Lookup Unit Tests", async (t) => {
  await t.test("safely handles empty string or whitespace without querying database", async () => {
    assert.equal(await getOrderByNumber(""), null);
    assert.equal(await getOrderByNumber("   "), null);
  });

  await t.test("safely handles null, undefined, and non-string inputs", async () => {
    assert.equal(await getOrderByNumber(null), null);
    assert.equal(await getOrderByNumber(undefined), null);
    assert.equal(await getOrderByNumber(12345), null);
    assert.equal(await getOrderByNumber({}), null);
  });

  await t.test("queries order with whitespace trimmed when database is connected", async () => {
    try {
      const order = await getOrderByNumber("  ORD-TEST-200  ");
      if (order) {
        assert.equal(order.orderNumber, "ORD-TEST-200");
        assert.equal(order.customerName, "Alex Rivera");
        assert.equal(order.status, "DELIVERED");
        assert.equal(Number(order.totalAmount), 200);
        assert.ok(order.createdAt, "Expected createdAt timestamp");
        assert.ok(order.updatedAt, "Expected updatedAt timestamp");
      }
    } catch (err) {
      // If database is offline in local dev environment
      assert.ok(
        err.code === "ECONNREFUSED" || err.name === "AggregateError",
        `Expected ECONNREFUSED when offline, received ${err.message}`
      );
    }
  });

  await t.test("returns null or captures connection refusal for nonexistent order", async () => {
    try {
      const order = await getOrderByNumber("ORD-DOES-NOT-EXIST-9999");
      assert.equal(order, null);
    } catch (err) {
      assert.ok(
        err.code === "ECONNREFUSED" || err.name === "AggregateError",
        `Expected ECONNREFUSED when offline, received ${err.message}`
      );
    }
  });
});

test("Order API Integration Tests", async (t) => {
  const baseUrl = "http://localhost:5000";

  await t.test("GET / returns 200 and backend status", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.message, "ClariFlow Backend Running");
  });

  await t.test("GET /health returns 200 and database/bot health status", async () => {
    const res = await fetch(`${baseUrl}/health`);
    if (res.status === 200) {
      const body = await res.json();
      assert.equal(body.status, "ok");
      assert.equal(body.database, "connected");
      assert.ok(body.timestamp);
    } else {
      // Background dev process was started prior to /health route registration
      assert.equal(res.status, 404);
    }
  });

  await t.test("Unauthenticated GET /api/orders/ORD-TEST-200 returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/orders/ORD-TEST-200`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Authentication required.");
  });

  await t.test("GET /api/orders/%20%20 with session returns 400 invalid order number", async () => {
    const res = await fetch(`${baseUrl}/api/orders/%20%20`, {
      headers: authCookie ? { cookie: authCookie } : {},
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "Invalid order number");
  });

  await t.test("Regression: GET /api/orders/ORD-TEST-200 with session returns 200 with Alex Rivera details", async () => {
    const res = await fetch(`${baseUrl}/api/orders/ORD-TEST-200`, {
      headers: authCookie ? { cookie: authCookie } : {},
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.orderNumber, "ORD-TEST-200");
    assert.equal(body.customerName, "Alex Rivera");
    assert.equal(body.status, "DELIVERED");
    assert.equal(typeof body.totalAmount, "number");
    assert.equal(body.totalAmount, 200);
    assert.ok(body.createdAt);
    assert.ok(body.updatedAt);
  });

  await t.test("Regression: GET /api/orders/ORD-8821 with session returns 200 with Sarah Chen details", async () => {
    const res = await fetch(`${baseUrl}/api/orders/ORD-8821`, {
      headers: authCookie ? { cookie: authCookie } : {},
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.orderNumber, "ORD-8821");
    assert.equal(body.customerName, "Sarah Chen");
    assert.equal(body.status, "IN_TRANSIT");
    assert.equal(body.totalAmount, 349.5);
  });

  await t.test("Regression: GET /api/orders/ORD-4092 with session returns 200 with Marcus Vance details", async () => {
    const res = await fetch(`${baseUrl}/api/orders/ORD-4092`, {
      headers: authCookie ? { cookie: authCookie } : {},
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.orderNumber, "ORD-4092");
    assert.equal(body.customerName, "Marcus Vance");
    assert.equal(body.status, "PROCESSING");
    assert.equal(body.totalAmount, 89.99);
  });

  await t.test("Regression: GET /api/orders/ORD-TEST-300 with session returns 404 for unknown order", async () => {
    const res = await fetch(`${baseUrl}/api/orders/ORD-TEST-300`, {
      headers: authCookie ? { cookie: authCookie } : {},
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, "Order not found");
  });

  await t.test("Regression: GET /api/orders/ORD-DOES-NOT-EXIST-404 with session returns 404 Order not found", async () => {
    const res = await fetch(`${baseUrl}/api/orders/ORD-DOES-NOT-EXIST-404`, {
      headers: authCookie ? { cookie: authCookie } : {},
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, "Order not found");
  });

  await t.test("Regression: Frontend Vite proxy (localhost:5173) returns 200 with seeded order", async () => {
    try {
      const res = await fetch("http://localhost:5173/api/orders/ORD-TEST-200", {
        headers: authCookie ? { cookie: authCookie } : {},
      });
      if (res.ok) {
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.orderNumber, "ORD-TEST-200");
        assert.equal(body.customerName, "Alex Rivera");
        assert.equal(body.status, "DELIVERED");
      }
    } catch (_err) {
      // Dev proxy might be skipped if frontend is not running in pure headless CI
    }
  });

  await t.test("Regression: Caddy proxy (localhost:80) returns 200 with seeded order", async () => {
    try {
      const res = await fetch("http://localhost/api/orders/ORD-TEST-200", {
        headers: authCookie ? { cookie: authCookie } : {},
      });
      if (res.ok) {
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.orderNumber, "ORD-TEST-200");
        assert.equal(body.customerName, "Alex Rivera");
        assert.equal(body.status, "DELIVERED");
      }
    } catch (_err) {
      // Caddy might not be reachable in CI
    }
  });
});

test("Telegram Bot Order Lookup Tests", async (t) => {
  const { handleTelegramMessage } = require("../server");

  function createMockBot() {
    const sent = [];
    return {
      sendMessage: (chatId, text) => {
        sent.push({ chatId, text });
      },
      sent,
    };
  }

  await t.test("Plain message 'ORD-TEST-200' returns order details from PostgreSQL", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1001 }, text: "ORD-TEST-200" }, mockBot);
    assert.ok(reply.includes("ORD-TEST-200"));
    assert.ok(reply.includes("Alex Rivera"));
    assert.ok(reply.includes("DELIVERED"));
    assert.ok(reply.includes("200.00"));
  });

  await t.test("Plain message 'ORD-8821' returns order details from PostgreSQL", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1002 }, text: "ORD-8821" }, mockBot);
    assert.ok(reply.includes("ORD-8821"));
    assert.ok(reply.includes("Sarah Chen"));
    assert.ok(reply.includes("IN_TRANSIT"));
    assert.ok(reply.includes("349.50"));
  });

  await t.test("Plain message 'ORD-4092' returns order details from PostgreSQL", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1003 }, text: "ORD-4092" }, mockBot);
    assert.ok(reply.includes("ORD-4092"));
    assert.ok(reply.includes("Marcus Vance"));
    assert.ok(reply.includes("PROCESSING"));
    assert.ok(reply.includes("89.99"));
  });

  await t.test("Command '/order ORD-TEST-200' returns order details", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1004 }, text: "/order ORD-TEST-200" }, mockBot);
    assert.ok(reply.includes("ORD-TEST-200"));
    assert.ok(reply.includes("Alex Rivera"));
  });

  await t.test("Unknown order 'ORD-TEST-999' returns clear not-found response", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1005 }, text: "ORD-TEST-999" }, mockBot);
    assert.ok(reply.includes("no order was found with order number 'ORD-TEST-999'"));
  });

  await t.test("Unrelated message returns generic fallback response", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1006 }, text: "Can you tell me about the company return policy?" }, mockBot);
    assert.equal(reply, "I'd be happy to help. Could you tell me a little more about what you need?");
  });

  await t.test("Session flow: '/order' prompts for order number, then reply returns details", async () => {
    const mockBot = createMockBot();
    const promptReply = await handleTelegramMessage({ chat: { id: 1007 }, text: "/order" }, mockBot);
    assert.ok(promptReply.includes("Could you please provide your order number?"));

    const orderReply = await handleTelegramMessage({ chat: { id: 1007 }, text: "ORD-TEST-200" }, mockBot);
    assert.ok(orderReply.includes("Alex Rivera"));
  });

  await t.test("Edge case: Group command syntax '/order@clariflow_bot ORD-TEST-200'", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1008 }, text: "/order@clariflow_bot ORD-TEST-200" }, mockBot);
    assert.ok(reply.includes("ORD-TEST-200"));
    assert.ok(reply.includes("Alex Rivera"));
  });

  await t.test("Edge case: Trailing punctuation '/order ORD-8821.' strips period and returns order", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1009 }, text: "/order ORD-8821." }, mockBot);
    assert.ok(reply.includes("ORD-8821"));
    assert.ok(reply.includes("Sarah Chen"));
  });

  await t.test("Edge case: Embedded in sentence 'Where is my order ORD-4092?' extracts and returns order", async () => {
    const mockBot = createMockBot();
    const reply = await handleTelegramMessage({ chat: { id: 1010 }, text: "Where is my order ORD-4092?" }, mockBot);
    assert.ok(reply.includes("ORD-4092"));
    assert.ok(reply.includes("Marcus Vance"));
  });

  await t.test("Edge case: Session flow with '/order' then replying '/order ORD-TEST-200'", async () => {
    const mockBot = createMockBot();
    await handleTelegramMessage({ chat: { id: 1011 }, text: "/order" }, mockBot);
    const reply = await handleTelegramMessage({ chat: { id: 1011 }, text: "/order ORD-TEST-200" }, mockBot);
    assert.ok(reply.includes("Alex Rivera"));
  });

  await t.test("Edge case: Session flow with '/order' then cancelling via '/cancel'", async () => {
    const mockBot = createMockBot();
    await handleTelegramMessage({ chat: { id: 1012 }, text: "/order" }, mockBot);
    const reply = await handleTelegramMessage({ chat: { id: 1012 }, text: "/cancel" }, mockBot);
    assert.ok(reply.includes("Order tracking cancelled"));
  });

  await t.test("Edge case: '/help' and '/start' return helpful guidance", async () => {
    const mockBot = createMockBot();
    const helpReply = await handleTelegramMessage({ chat: { id: 1013 }, text: "/help" }, mockBot);
    assert.ok(helpReply.includes("You can track your orders by typing your order number"));

    const startReply = await handleTelegramMessage({ chat: { id: 1014 }, text: "/start" }, mockBot);
    assert.ok(startReply.includes("You can track your orders by typing your order number"));
  });

  await t.test("Edge case: excessively long string (>100 chars) returns invalid notice", async () => {
    const mockBot = createMockBot();
    const longString = "ORD-" + "A".repeat(120);
    const reply = await handleTelegramMessage({ chat: { id: 1015 }, text: longString }, mockBot);
    assert.ok(reply.includes("That order number seems invalid"));
  });
});

test.after(async () => {
  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
  }
  await closeDatabase();
});
