const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const postRoutes = require("./routes/postRoutes");
const commentRoutes = require("./routes/commentRoutes");
const scanRoutes = require("./routes/scanRoutes");
const eventRoutes = require("./routes/eventRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const groupRoutes = require("./routes/groupRoutes");
const userSettingsRoutes = require("./routes/userSettingsRoutes");
const savedItemsRoutes = require("./routes/savedItemsRoutes");

const app = express();

// Trust the reverse proxy (Render load balancer) so secure cookies can be set
app.set("trust proxy", 1);

// Security middleware with comprehensive security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    frameguard: {
      action: "deny",
    },
    noSniff: true,
  })
);

// Additional security headers (Permissions-Policy)
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  next();
});

// CORS configuration
const clientOrigin = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.replace(/\/$/, "") 
  : "http://localhost:5173";

// Allow multiple origins for development
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? clientOrigin 
  : [clientOrigin, "http://localhost:5174", "http://localhost:5175"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Rate limiting
const RATE_LIMIT_MESSAGE =
  "Too many requests from this IP, please try again later.";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Scanner status polling can be frequent while scans run
  skip: (req) => req.method === "GET" && /^\/api\/scans\/\d+$/.test(req.path),
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json({ error: RATE_LIMIT_MESSAGE });
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/posts", postRoutes);
app.use("/api", commentRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/user/settings", userSettingsRoutes);
app.use("/api/saved-items", savedItemsRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    environment: process.env.NODE_ENV || "development",
    https: isSecure,
    timestamp: new Date().toISOString(),
    protocol: req.protocol,
    host: req.get('host'),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;
