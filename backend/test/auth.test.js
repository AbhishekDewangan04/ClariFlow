/**
 * auth.test.js — Security and authorization tests for ClariFlow.
 *
 * Tests cover:
 *   1. Authentication (login, logout, session restoration /me, cookie security, bad credentials)
 *   2. Role Permissions & Privilege Escalation (admin, manager, staff boundaries, endpoint protection, self-lockout prevention)
 *   3. Invalid Transitions (role transition matrix, DELIVERED state locking, invalid statuses, identical status rejection)
 *   4. Audit Logging (access control, pagination, filtering, mutation event tracking)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { closeDatabase, getPool } = require("../src/db");

const BASE = "http://localhost:5000";
let testServer = null;

async function resetTestOrders() {
  try {
    const pool = getPool();
    await pool.query(`UPDATE "Order" SET status = 'DELIVERED' WHERE "orderNumber" = 'ORD-TEST-200'`);
    await pool.query(`UPDATE "Order" SET status = 'IN_TRANSIT' WHERE "orderNumber" = 'ORD-8821'`);
    await pool.query(`UPDATE "Order" SET status = 'PROCESSING' WHERE "orderNumber" = 'ORD-4092'`);
  } catch {}
}

// ─── Self-starting Server Hook ────────────────────────────────────────────────
test.before(async () => {
  try {
    const res = await fetch(`${BASE}/`);
    if (res.ok) {
      await resetTestOrders();
      return; // Server is already running
    }
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
  await resetTestOrders();
});

test.after(async () => {
  await resetTestOrders();
  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
  }
  await closeDatabase();
});

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

async function post(path, body, cookies = "") {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { _raw: text.slice(0, 200) }; }
  return { status: res.status, body: parsed, headers: res.headers };
}

async function get(path, cookies = "") {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function patch(path, body, cookies = "") {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function del(path, cookies = "") {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

function extractCookie(headers) {
  const raw = headers.get("set-cookie") || "";
  const match = raw.match(/cf_token=([^;]+)/);
  return match ? `cf_token=${match[1]}` : "";
}

// ─── 1. Authentication Tests ──────────────────────────────────────────────────

test("Security 1 — Authentication", async (t) => {
  await t.test("POST /api/auth/login with valid admin credentials returns 200 and user payload", async () => {
    const { status, body, headers } = await post("/api/auth/login", {
      email: "admin@clariflow.local",
      password: "ClariFlow@Admin2026",
    });
    assert.equal(status, 200);
    assert.ok(body.user, "Expected user in response body");
    assert.equal(body.user.role, "admin");
    assert.equal(typeof body.user.id, "number");
    assert.equal(body.user.email, "admin@clariflow.local");
    assert.ok(!body.user.password, "Password must not be returned");
    assert.ok(headers.get("set-cookie")?.includes("cf_token"), "Expected cf_token cookie");
  });

  await t.test("POST /api/auth/login with wrong password returns 401 Unauthorized", async () => {
    const { status, body } = await post("/api/auth/login", {
      email: "admin@clariflow.local",
      password: "IncorrectPassword!",
    });
    assert.equal(status, 401);
    assert.ok(body.error);
  });

  await t.test("POST /api/auth/login with non-existent email returns 401 Unauthorized", async () => {
    const { status, body } = await post("/api/auth/login", {
      email: "ghost@nowhere.com",
      password: "SomePassword123",
    });
    assert.equal(status, 401);
    assert.ok(body.error);
  });

  await t.test("POST /api/auth/login with missing email or password returns 400 Bad Request", async () => {
    const res1 = await post("/api/auth/login", { email: "admin@clariflow.local" });
    assert.equal(res1.status, 400);

    const res2 = await post("/api/auth/login", { password: "ClariFlow@Admin2026" });
    assert.equal(res2.status, 400);
  });

  await t.test("GET /api/auth/me without cookie returns 401 Unauthorized", async () => {
    const { status } = await get("/api/auth/me");
    assert.equal(status, 401);
  });

  await t.test("GET /api/auth/me with valid cookie returns active user session", async () => {
    const login = await post("/api/auth/login", {
      email: "admin@clariflow.local",
      password: "ClariFlow@Admin2026",
    });
    const cookie = extractCookie(login.headers);
    assert.ok(cookie);

    const { status, body } = await get("/api/auth/me", cookie);
    assert.equal(status, 200);
    assert.equal(body.user.email, "admin@clariflow.local");
    assert.equal(body.user.role, "admin");
  });

  await t.test("GET /api/auth/me with tampered token cookie returns 401 Unauthorized", async () => {
    const { status } = await get("/api/auth/me", "cf_token=tampered.token.signature");
    assert.equal(status, 401);
  });

  await t.test("POST /api/auth/logout without cookie returns 401 Unauthorized", async () => {
    const { status } = await post("/api/auth/logout", {});
    assert.equal(status, 401);
  });

  await t.test("POST /api/auth/logout with valid cookie clears session and returns 200", async () => {
    const login = await post("/api/auth/login", {
      email: "admin@clariflow.local",
      password: "ClariFlow@Admin2026",
    });
    const cookie = extractCookie(login.headers);

    const { status, headers } = await post("/api/auth/logout", {}, cookie);
    assert.equal(status, 200);
    const setCookie = headers.get("set-cookie") || "";
    assert.ok(
      setCookie.includes("cf_token=") && (setCookie.includes("Max-Age=0") || setCookie.includes("Expires=")),
      `Expected cookie clearance, got: ${setCookie}`
    );
  });
});

// ─── 2. Role Permissions & Privilege Escalation Tests ─────────────────────────

test("Security 2 — Role Permissions & Privilege Escalation", async (t) => {
  let adminCookie = "";
  let staffCookie = "";
  let managerCookie = "";

  await t.test("Setup accounts for role boundary testing", async () => {
    // Admin login
    const adminLogin = await post("/api/auth/login", {
      email: "admin@clariflow.local",
      password: "ClariFlow@Admin2026",
    });
    assert.equal(adminLogin.status, 200);
    adminCookie = extractCookie(adminLogin.headers);

    // Create staff member
    const createStaff = await post(
      "/api/admin/users",
      {
        name: "Role Test Staff",
        email: "staff_perm_test@clariflow.local",
        password: "StaffPassword@123",
        role: "staff",
      },
      adminCookie
    );
    assert.ok(createStaff.status === 201 || createStaff.status === 409);

    // Create manager member
    const createMgr = await post(
      "/api/admin/users",
      {
        name: "Role Test Manager",
        email: "manager_perm_test@clariflow.local",
        password: "ManagerPassword@123",
        role: "manager",
      },
      adminCookie
    );
    assert.ok(createMgr.status === 201 || createMgr.status === 409);

    // Login as staff
    const staffLogin = await post("/api/auth/login", {
      email: "staff_perm_test@clariflow.local",
      password: "StaffPassword@123",
    });
    assert.equal(staffLogin.status, 200);
    staffCookie = extractCookie(staffLogin.headers);

    // Login as manager
    const mgrLogin = await post("/api/auth/login", {
      email: "manager_perm_test@clariflow.local",
      password: "ManagerPassword@123",
    });
    assert.equal(mgrLogin.status, 200);
    managerCookie = extractCookie(mgrLogin.headers);
  });

  await t.test("Staff cannot list users GET /api/admin/users (403 Forbidden)", async () => {
    const { status } = await get("/api/admin/users", staffCookie);
    assert.equal(status, 403);
  });

  await t.test("Manager cannot list users GET /api/admin/users (403 Forbidden)", async () => {
    const { status } = await get("/api/admin/users", managerCookie);
    assert.equal(status, 403);
  });

  await t.test("Staff cannot create new users POST /api/admin/users (403 Forbidden)", async () => {
    const { status } = await post(
      "/api/admin/users",
      { name: "Escalate", email: "escalate@clariflow.local", password: "Password@123", role: "admin" },
      staffCookie
    );
    assert.equal(status, 403);
  });

  await t.test("Staff cannot change user roles PATCH /api/admin/users/:id/role (403 Forbidden)", async () => {
    const { status } = await patch("/api/admin/users/1/role", { role: "admin" }, staffCookie);
    assert.equal(status, 403);
  });

  await t.test("Staff cannot deactivate users DELETE /api/admin/users/:id (403 Forbidden)", async () => {
    const { status } = await del("/api/admin/users/1", staffCookie);
    assert.equal(status, 403);
  });

  await t.test("Staff cannot view audit logs GET /api/admin/audit-logs (403 Forbidden)", async () => {
    const { status } = await get("/api/admin/audit-logs", staffCookie);
    assert.equal(status, 403);
  });

  await t.test("Manager cannot view audit logs GET /api/admin/audit-logs (403 Forbidden)", async () => {
    const { status } = await get("/api/admin/audit-logs", managerCookie);
    assert.equal(status, 403);
  });

  await t.test("Privilege Escalation: Invalid role strings default to 'staff' (cannot create superuser)", async () => {
    const { status, body } = await post(
      "/api/admin/users",
      {
        name: "Role Injection Attempt",
        email: "injection_test@clariflow.local",
        password: "InjectionPassword@123",
        role: "superuser_godmode",
      },
      adminCookie
    );
    assert.ok(status === 201 || status === 409);
    if (status === 201) {
      assert.equal(body.user.role, "staff", "Invalid role must default to staff");
    }
  });

  await t.test("Privilege Escalation: Admin cannot demote their own account (prevents lockout)", async () => {
    const me = await get("/api/auth/me", adminCookie);
    const adminId = me.body.user.id;

    const { status, body } = await patch(`/api/admin/users/${adminId}/role`, { role: "staff" }, adminCookie);
    assert.equal(status, 400);
    assert.ok(body.error?.includes("cannot change your own role"));
  });

  await t.test("Privilege Escalation: Admin cannot deactivate their own account", async () => {
    const me = await get("/api/auth/me", adminCookie);
    const adminId = me.body.user.id;

    const { status, body } = await del(`/api/admin/users/${adminId}`, adminCookie);
    assert.equal(status, 400);
    assert.ok(body.error?.includes("cannot deactivate yourself"));
  });
});

// ─── 3. Invalid Order Status Transitions Tests ────────────────────────────────

test("Security 3 — Invalid Transitions", async (t) => {
  let adminCookie = "";
  let staffCookie = "";
  let managerCookie = "";

  await t.test("Setup role cookies", async () => {
    const a = await post("/api/auth/login", { email: "admin@clariflow.local", password: "ClariFlow@Admin2026" });
    adminCookie = extractCookie(a.headers);

    const s = await post("/api/auth/login", { email: "staff_perm_test@clariflow.local", password: "StaffPassword@123" });
    staffCookie = extractCookie(s.headers);

    const m = await post("/api/auth/login", { email: "manager_perm_test@clariflow.local", password: "ManagerPassword@123" });
    managerCookie = extractCookie(m.headers);
  });

  await t.test("Unauthenticated status update returns 401 Unauthorized (public lookup is read-only)", async () => {
    const { status } = await patch("/api/orders/ORD-TEST-200/status", { status: "PROCESSING" });
    assert.equal(status, 401);
  });

  await t.test("Nonexistent order number returns 404 Not Found", async () => {
    const { status } = await patch("/api/orders/ORD-NONEXISTENT-9999/status", { status: "SHIPPED" }, adminCookie);
    assert.equal(status, 404);
  });

  await t.test("Invalid status name (e.g. 'FLYING') returns 400 Bad Request", async () => {
    const { status, body } = await patch("/api/orders/ORD-TEST-200/status", { status: "FLYING" }, adminCookie);
    assert.equal(status, 400);
    assert.ok(body.error?.includes("Invalid status"));
  });

  await t.test("Transitioning to the identical current status returns 400 Bad Request", async () => {
    // ORD-TEST-200 is DELIVERED
    const orderRes = await get("/api/orders/ORD-TEST-200");
    const currentStatus = orderRes.body.status;

    const { status, body } = await patch("/api/orders/ORD-TEST-200/status", { status: currentStatus }, adminCookie);
    assert.equal(status, 400);
    assert.ok(body.error?.includes("already in that status"));
  });

  await t.test("Staff cannot transition an order to CANCELLED (403 Forbidden)", async () => {
    // ORD-8821 is IN_TRANSIT
    const { status, body } = await patch("/api/orders/ORD-8821/status", { status: "CANCELLED" }, staffCookie);
    assert.equal(status, 403);
    assert.ok(body.error?.includes("cannot change status"));
  });

  await t.test("Staff cannot transition an order to DELIVERED (403 Forbidden)", async () => {
    // ORD-4092 is PROCESSING
    const { status, body } = await patch("/api/orders/ORD-4092/status", { status: "DELIVERED" }, staffCookie);
    assert.equal(status, 403);
    assert.ok(body.error?.includes("cannot change status"));
  });

  await t.test("Staff can transition PROCESSING to SHIPPED (200 OK)", async () => {
    // Ensure ORD-4092 is in PROCESSING first via admin
    await patch("/api/orders/ORD-4092/status", { status: "PROCESSING" }, adminCookie);

    const { status, body } = await patch("/api/orders/ORD-4092/status", { status: "SHIPPED" }, staffCookie);
    assert.equal(status, 200);
    assert.equal(body.status, "SHIPPED");
    assert.equal(body.orderNumber, "ORD-4092");
    assert.ok(body.updatedBy);
  });

  await t.test("Manager cannot perform backward transitions (e.g. SHIPPED -> PROCESSING) (403 Forbidden)", async () => {
    // ORD-4092 is now SHIPPED; backward transition to PROCESSING is forbidden for manager
    const { status, body } = await patch("/api/orders/ORD-4092/status", { status: "PROCESSING" }, managerCookie);
    assert.equal(status, 403);
    assert.ok(body.error?.includes("cannot change status"));
  });

  await t.test("Non-admin cannot transition a DELIVERED order (terminal state locked) (403 Forbidden)", async () => {
    // Reset ORD-TEST-200 to DELIVERED
    await patch("/api/orders/ORD-TEST-200/status", { status: "DELIVERED" }, adminCookie);

    const { status } = await patch("/api/orders/ORD-TEST-200/status", { status: "SHIPPED" }, managerCookie);
    assert.equal(status, 403);
  });

  await t.test("Admin can transition to any valid status (admin override)", async () => {
    const { status, body } = await patch("/api/orders/ORD-4092/status", { status: "PROCESSING" }, adminCookie);
    assert.equal(status, 200);
    assert.equal(body.status, "PROCESSING");
  });
});

// ─── 4. Audit Logging Tests ───────────────────────────────────────────────────

test("Security 4 — Audit Logging", async (t) => {
  let adminCookie = "";

  await t.test("Login as admin", async () => {
    const a = await post("/api/auth/login", { email: "admin@clariflow.local", password: "ClariFlow@Admin2026" });
    adminCookie = extractCookie(a.headers);
    assert.ok(adminCookie);
  });

  await t.test("GET /api/admin/audit-logs without authentication returns 401 Unauthorized", async () => {
    const { status } = await get("/api/admin/audit-logs");
    assert.equal(status, 401);
  });

  await t.test("GET /api/admin/audit-logs as admin returns paginated logs with meta", async () => {
    const { status, body } = await get("/api/admin/audit-logs", adminCookie);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.logs), "Expected logs array");
    assert.equal(typeof body.total, "number");
    assert.equal(typeof body.page, "number");
    assert.equal(typeof body.limit, "number");
    assert.equal(typeof body.totalPages, "number");
    assert.ok(body.logs.length >= 1, "Expected audit records");

    // Verify record structure
    const record = body.logs[0];
    assert.ok(record.id);
    assert.ok(record.action);
    assert.ok(record.createdAt);
  });

  await t.test("Pagination parameters (page, limit) are respected", async () => {
    const { status, body } = await get("/api/admin/audit-logs?page=1&limit=2", adminCookie);
    assert.equal(status, 200);
    assert.ok(body.logs.length <= 2, `Expected at most 2 logs, got ${body.logs.length}`);
    assert.equal(body.limit, 2);
    assert.equal(body.page, 1);
  });

  await t.test("Action filter (action=order.status_update) returns only matching events", async () => {
    const { status, body } = await get("/api/admin/audit-logs?action=order.status_update", adminCookie);
    assert.equal(status, 200);
    for (const log of body.logs) {
      assert.equal(log.action, "order.status_update");
    }
  });

  await t.test("Status updates and logins generate verified audit records", async () => {
    // Generate a status update
    await patch("/api/orders/ORD-8821/status", { status: "SHIPPED" }, adminCookie);

    // Fetch latest audit logs
    const { status, body } = await get("/api/admin/audit-logs?limit=5", adminCookie);
    assert.equal(status, 200);

    const updateEvent = body.logs.find(
      (l) => l.action === "order.status_update" && l.target === "ORD-8821"
    );
    assert.ok(updateEvent, "Expected audit log for ORD-8821 status update");
    assert.equal(updateEvent.actorEmail, "admin@clariflow.local");
    assert.ok(updateEvent.detail);

    // Clean up ORD-8821 back to IN_TRANSIT
    await patch("/api/orders/ORD-8821/status", { status: "IN_TRANSIT" }, adminCookie);
  });
});

test("Security 5 — Hardening: Immediate Session Invalidation & Zero Credential Leakage", async (t) => {
  // 1. Login as admin
  const loginRes = await post("/api/auth/login", {
    email: "admin@clariflow.local",
    password: "ClariFlow@Admin2026",
  });
  const adminCookie = extractCookie(loginRes.headers);

  await t.test("Deactivated user session is immediately invalidated (cannot continue using existing JWT)", async () => {
    // Admin creates a new user
    const uniqueEmail = `deact-${Date.now()}@clariflow.local`;
    const createRes = await post(
      "/api/admin/users",
      { email: uniqueEmail, name: "Temporary User", password: "Password123!", role: "staff" },
      adminCookie
    );
    assert.equal(createRes.status, 201);
    const userId = createRes.body.user.id;

    // User logs in and gets active session cookie
    const userLogin = await post("/api/auth/login", {
      email: uniqueEmail,
      password: "Password123!",
    });
    assert.equal(userLogin.status, 200);
    const userCookie = extractCookie(userLogin.headers);

    // Verify session is active
    const meBefore = await get("/api/auth/me", userCookie);
    assert.equal(meBefore.status, 200);
    assert.equal(meBefore.body.user.email, uniqueEmail);

    // Admin deactivates the user
    const deactRes = await del(`/api/admin/users/${userId}`, adminCookie);
    assert.equal(deactRes.status, 200);

    // User immediately attempts to use their existing token
    const meAfter = await get("/api/auth/me", userCookie);
    assert.equal(meAfter.status, 401, "Expected 401 Unauthorized for deactivated user");
    assert.ok(
      meAfter.body.error?.includes("deactivated") || meAfter.body.error?.includes("removed"),
      `Expected deactivation error message, got: ${meAfter.body.error}`
    );

    // User cannot mutate order status with existing token
    const mutateAttempt = await patch(
      "/api/orders/ORD-4092/status",
      { status: "SHIPPED" },
      userCookie
    );
    assert.equal(mutateAttempt.status, 401);
  });

  await t.test("Role demotion takes effect immediately on next request with existing session", async () => {
    // Admin creates a second admin
    const uniqueEmail = `demote-${Date.now()}@clariflow.local`;
    const createRes = await post(
      "/api/admin/users",
      { email: uniqueEmail, name: "Demote Candidate", password: "Password123!", role: "admin" },
      adminCookie
    );
    assert.equal(createRes.status, 201);
    const userId = createRes.body.user.id;

    // Candidate logs in with admin privileges
    const candidateLogin = await post("/api/auth/login", {
      email: uniqueEmail,
      password: "Password123!",
    });
    assert.equal(candidateLogin.status, 200);
    const candidateCookie = extractCookie(candidateLogin.headers);

    // Can access admin users list
    const adminCheck = await get("/api/admin/users", candidateCookie);
    assert.equal(adminCheck.status, 200);

    // Super admin demotes the user to staff
    const demoteRes = await patch(
      `/api/admin/users/${userId}/role`,
      { role: "staff" },
      adminCookie
    );
    assert.equal(demoteRes.status, 200);

    // Candidate immediately attempts to access admin users list with their existing cookie
    const staffCheck = await get("/api/admin/users", candidateCookie);
    assert.equal(staffCheck.status, 403, "Expected 403 Forbidden after role demotion");
  });

  await t.test("Zero credential exposure: user lists and profile responses never return passwords or secrets", async () => {
    const { status, body } = await get("/api/admin/users", adminCookie);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.users) && body.users.length > 0);

    for (const u of body.users) {
      assert.equal(u.password, undefined, "User record must never include password field");
      assert.equal(u.hash, undefined, "User record must never include hash field");
      assert.equal(u.jwt_secret, undefined, "User record must never include jwt_secret");
    }

    const meRes = await get("/api/auth/me", adminCookie);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.password, undefined, "Profile must never include password field");
  });
});

