/**
 * auth.js — JWT-based authentication helpers for ClariFlow.
 *
 * Tokens are delivered as HTTP-only, SameSite=None cookies so they work
 * across the Vercel frontend and the local/Docker backend.
 *
 * The cookie name is "cf_token".  Changing it is a breaking change.
 */

const jwt = require("jsonwebtoken");

const COOKIE_NAME = "cf_token";
const JWT_EXPIRY = "8h";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or too short (minimum 32 chars). Set it in .env."
    );
  }
  return secret;
}

/** Sign a JWT payload and return the signed token string. */
function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRY });
}

/** Attach the auth cookie to a response. */
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
    path: "/",
  });
}

/** Clear the auth cookie (logout). */
function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
}

const { getUserById } = require("./users");

/**
 * Express middleware: verify the JWT cookie and verify live account status.
 * Rejects deactivated users immediately (even if their JWT token is still valid).
 * Returns 401 if the cookie is missing, invalid, or the user is deactivated.
 */
async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }
  try {
    const decoded = jwt.verify(token, getSecret());

    // Live account verification: check database to immediately revoke deactivated sessions
    let user = null;
    try {
      user = await getUserById(decoded.id);
    } catch (dbErr) {
      console.error("[Auth] Database check error during requireAuth:", dbErr.message || dbErr);
      return res.status(503).json({ error: "Service temporarily unavailable." });
    }

    if (!user || user.isActive === false) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Account has been deactivated or removed." });
    }

    // Refresh role & user attributes from active database record
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

/**
 * Factory: returns middleware that requires one of the given roles.
 * Must be placed AFTER requireAuth in the middleware chain.
 *
 * @param {...string} roles  e.g. requireRole('admin') or requireRole('admin','manager')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
}

module.exports = {
  COOKIE_NAME,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireRole,
};
