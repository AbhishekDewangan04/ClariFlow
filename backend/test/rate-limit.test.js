const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { rateLimit } = require("express-rate-limit");

test("Rate Limiting Security Tests", async (t) => {
  await t.test("Login rate limiter throttles repeated requests with 429 and standard headers", async () => {
    const app = express();
    app.use(express.json());

    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 3,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many login attempts. Please wait 15 minutes before trying again." },
    });

    app.post("/test-login", testLimiter, (req, res) => {
      res.json({ ok: true });
    });

    const server = app.listen(0);
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}/test-login`;

    try {
      // 1st request -> 200
      const res1 = await fetch(url, { method: "POST" });
      assert.equal(res1.status, 200);

      // 2nd request -> 200
      const res2 = await fetch(url, { method: "POST" });
      assert.equal(res2.status, 200);

      // 3rd request -> 200
      const res3 = await fetch(url, { method: "POST" });
      assert.equal(res3.status, 200);

      // 4th request -> 429 Too Many Requests
      const res4 = await fetch(url, { method: "POST" });
      assert.equal(res4.status, 429, "Expected 429 Too Many Requests after limit reached");
      
      const body4 = await res4.json();
      assert.ok(
        body4.error.includes("Too many login attempts"),
        `Expected rate limit error message, got: ${body4.error}`
      );
      assert.ok(res4.headers.has("retry-after"), "Expected retry-after header");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test("General auth limiter blocks burst abuse with safe error response", async () => {
    const app = express();

    const authLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 2,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many authentication requests. Please try again later." },
    });

    app.get("/test-auth", authLimiter, (req, res) => {
      res.json({ ok: true });
    });

    const server = app.listen(0);
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}/test-auth`;

    try {
      await fetch(url);
      await fetch(url);
      const blocked = await fetch(url);
      assert.equal(blocked.status, 429);
      const data = await blocked.json();
      assert.ok(data.error.includes("Too many authentication requests"));
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
