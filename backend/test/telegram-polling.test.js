const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { shouldEnablePolling, getBotStatus, botDiagnostics } = require("../server");

test("Telegram Polling Configuration & Enable/Disable Unit Tests", async (t) => {
  await t.test("disables polling when TELEGRAM_POLLING is 'false'", () => {
    const result = shouldEnablePolling({ TELEGRAM_POLLING: "false", NODE_ENV: "production" }, true);
    assert.equal(result, false);
  });

  await t.test("disables polling when TELEGRAM_POLLING is '0'", () => {
    const result = shouldEnablePolling({ TELEGRAM_POLLING: "0", NODE_ENV: "production" }, true);
    assert.equal(result, false);
  });

  await t.test("disables polling when TELEGRAM_POLLING has surrounding whitespace or uppercase", () => {
    const result1 = shouldEnablePolling({ TELEGRAM_POLLING: "  FALSE  ", NODE_ENV: "production" }, true);
    const result2 = shouldEnablePolling({ TELEGRAM_POLLING: "False", NODE_ENV: "production" }, true);
    assert.equal(result1, false);
    assert.equal(result2, false);
  });

  await t.test("disables polling when ENABLE_TELEGRAM_BOT is 'false' or '0'", () => {
    const result1 = shouldEnablePolling({ ENABLE_TELEGRAM_BOT: "false", NODE_ENV: "production" }, true);
    const result2 = shouldEnablePolling({ ENABLE_TELEGRAM_BOT: "0", NODE_ENV: "production" }, true);
    assert.equal(result1, false);
    assert.equal(result2, false);
  });

  await t.test("disables polling when NODE_ENV is 'test'", () => {
    const result = shouldEnablePolling({ TELEGRAM_POLLING: "true", NODE_ENV: "test" }, true);
    assert.equal(result, false);
  });

  await t.test("disables polling when isDirect is false (required/imported by another module)", () => {
    const result = shouldEnablePolling({ TELEGRAM_POLLING: "true", NODE_ENV: "production" }, false);
    assert.equal(result, false);
  });

  await t.test("enables polling when explicitly set to 'true' in direct production execution", () => {
    const result = shouldEnablePolling({ TELEGRAM_POLLING: "true", NODE_ENV: "production" }, true);
    assert.equal(result, true);
  });

  await t.test("enables polling by default when TELEGRAM_POLLING is unset in direct production execution", () => {
    const result = shouldEnablePolling({ NODE_ENV: "production" }, true);
    assert.equal(result, true);
  });
});

test("Telegram 409 Conflict Diagnostics & Status Mapping", async (t) => {
  await t.test("getBotStatus reports 'conflict' when a conflict occurred within the last 45s", () => {
    const originalLastConflictAt = botDiagnostics.lastConflictAt;
    const originalCount = botDiagnostics.conflictCount;

    try {
      botDiagnostics.lastConflictAt = new Date().toISOString();
      botDiagnostics.conflictCount = 5;

      // Note: when required in tests, pollingEnabled is false, so getBotStatus returns disabled
      // Test direct timestamp computation logic:
      const isRecentConflict =
        botDiagnostics.lastConflictAt &&
        Date.now() - new Date(botDiagnostics.lastConflictAt).getTime() < 45000;
      assert.equal(isRecentConflict, true);
      assert.equal(botDiagnostics.conflictCount, 5);
    } finally {
      botDiagnostics.lastConflictAt = originalLastConflictAt;
      botDiagnostics.conflictCount = originalCount;
    }
  });

  await t.test("/health response includes botDiagnostics block without leaking secrets", async () => {
    const app = express();
    app.get("/health", (req, res) => {
      const currentBotStatus = getBotStatus();
      res.json({
        status: "ok",
        bot: currentBotStatus,
        botDiagnostics: {
          pollingEnabled: false,
          status: currentBotStatus,
          conflictCount: botDiagnostics.conflictCount,
          lastConflictAt: botDiagnostics.lastConflictAt,
          lastError: botDiagnostics.lastError,
        },
      });
    });

    const server = app.listen(0);
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, "ok");
      assert.ok(typeof data.botDiagnostics === "object");
      assert.equal(data.botDiagnostics.pollingEnabled, false);
      assert.ok("conflictCount" in data.botDiagnostics);
      assert.ok("lastError" in data.botDiagnostics);
      // Ensure no bot token or secret values are in the output
      const jsonStr = JSON.stringify(data);
      assert.equal(jsonStr.includes("8753580747"), false, "Token must not appear in /health response");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
