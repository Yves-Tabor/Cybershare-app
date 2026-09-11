const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { hashToken } = require("../utils/sessionUtils");

const authMiddleware = async (req, res, next) => {
  try {
    // Accept token from cookie OR Authorization: Bearer <token> header
    let token = req.cookies.token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify JWT signature + expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check the session is still active in the DB
    const tokenHash = hashToken(token);
    const sessionResult = await pool.query(
      "SELECT id FROM user_sessions WHERE token_hash = $1 AND is_revoked = false",
      [tokenHash]
    );

    if (sessionResult.rows.length === 0) {
      // Token was revoked or never registered — treat as unauthorized
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      return res.status(401).json({ error: "Session expired or revoked" });
    }

    // Keep last_seen fresh (fire and forget — don't block the request)
    pool.query(
      "UPDATE user_sessions SET last_seen = NOW() WHERE token_hash = $1",
      [tokenHash]
    ).catch(() => {});

    // Attach user ID and current token to request
    req.userId = decoded.userId;
    req.token = token;
    req.tokenHash = tokenHash;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Optional auth — tries to decode token but doesn't fail if missing
const optionalAuth = (req, res, next) => {
  try {
    let token = req.cookies.token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    }
  } catch (error) {
    // Token invalid or expired — just continue without auth
  }
  next();
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;

