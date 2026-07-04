const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
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

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user ID to request
    req.userId = decoded.userId;

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
