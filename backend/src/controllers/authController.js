const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { hashToken, parseDevice, getClientIp } = require("../utils/sessionUtils");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const recordSession = async (userId, token, req) => {
  try {
    const tokenHash = hashToken(token);
    const device = parseDevice(req.headers["user-agent"]);
    const ipAddress = getClientIp(req);
    await pool.query(
      "INSERT INTO user_sessions (user_id, token_hash, device, ip_address) VALUES ($1, $2, $3, $4)",
      [userId, tokenHash, device, ipAddress]
    );
  } catch (error) {
    console.error("Failed to record session:", error);
  }
};


// Register user
const register = async (req, res) => {
  try {
    const { username, email, bio } = req.body;

    // Normalize username: lowercase and remove spaces
    const normalizedUsername = username.toLowerCase().replace(/\s+/g, "");

    // Check that username contains at least 4 letters
    const letterCount = (normalizedUsername.match(/[a-z]/g) || []).length;
    if (letterCount < 4) {
      return res
        .status(400)
        .json({ error: "Username must contain at least 4 letters" });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, normalizedUsername],
    );

    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "User with this email or username already exists" });
    }

    // Insert user with normalized username (no password initially)
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, bio) VALUES ($1, $2, $3, $4) RETURNING id, username, email, bio, avatar, avatar_color, display_name, role, created_at",
      [normalizedUsername, email, null, bio || null],
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken(user.id);

    // Record session
    await recordSession(user.id, token, req);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        display_name: user.display_name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      "SELECT id, username, email, password_hash, bio, avatar, avatar_color, display_name, role, created_at FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials. Please log in with Google or create a password." });
    }
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user.id);

    // Record session
    await recordSession(user.id, token, req);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        display_name: user.display_name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get current user
const me = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      "SELECT id, username, email, bio, avatar, avatar_color, display_name, role, created_at, password_hash FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        display_name: user.display_name,
        role: user.role,
        createdAt: user.created_at,
        hasPassword: !!user.password_hash,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    let token = req.cookies.token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }
    if (token) {
      const tokenHash = hashToken(token);
      await pool.query(
        "UPDATE user_sessions SET is_revoked = true WHERE token_hash = $1",
        [tokenHash]
      );
    }
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Google OAuth callback
const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    // Check if user has completed profile setup
    const userResult = await pool.query(
      "SELECT username, password_hash FROM users WHERE id = $1",
      [user.id],
    );
    const userData = userResult.rows[0];

    // Generate token
    const token = generateToken(user.id);

    // Record session
    await recordSession(user.id, token, req);

    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, "");

    // Check if user needs to complete profile (has default username from email)
    const needsProfileCompletion =
      userData.username.includes("@") || !userData.password_hash;

    // Pass token as URL param so the frontend can store it reliably
    // (cross-site cookie delivery during redirects is unreliable in production)
    if (needsProfileCompletion) {
      res.redirect(`${clientUrl}/main?token=${token}&complete_profile=true`);
    } else {
      res.redirect(`${clientUrl}/main?token=${token}`);
    }
  } catch (error) {
    console.error("Google callback error:", error);
    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, "");
    res.redirect(`${clientUrl}/#p-auth?error=google_auth_failed`);
  }
};

// Complete profile for Google OAuth users
const completeProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { username, password, bio } = req.body;

    let result;
    let passwordHash = null;
    if (password) {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    if (username) {
      // Normalize username
      const normalizedUsername = username.toLowerCase().replace(/\s+/g, "");

      const letterCount = (normalizedUsername.match(/[a-z]/g) || []).length;
      if (letterCount < 4) {
        return res.status(400).json({ error: "Username must contain at least 4 letters" });
      }

      // Check if username is already taken
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        [normalizedUsername, userId],
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Update user with new username
      result = await pool.query(
        "UPDATE users SET username = $1, password_hash = COALESCE($2, password_hash), bio = COALESCE($3, bio) WHERE id = $4 RETURNING id, username, email, bio, avatar, avatar_color, display_name, role, created_at",
        [normalizedUsername, passwordHash, bio !== undefined ? (bio || null) : null, userId],
      );
    } else {
      // Update user without changing username
      result = await pool.query(
        "UPDATE users SET password_hash = COALESCE($1, password_hash), bio = COALESCE($2, bio) WHERE id = $3 RETURNING id, username, email, bio, avatar, avatar_color, display_name, role, created_at",
        [passwordHash, bio !== undefined ? (bio || null) : null, userId],
      );
    }

    const user = result.rows[0];

    res.status(200).json({
      message: "Profile completed successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        display_name: user.display_name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user profile settings
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { username, bio, color } = req.body;

    // Normalize username if provided
    const normalizedUsername = username ? username.toLowerCase().replace(/\s+/g, "") : null;

    // Check if username is already taken (if changing username)
    if (normalizedUsername) {
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        [normalizedUsername, userId],
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (normalizedUsername) {
      updates.push(`username = $${paramIndex++}`);
      values.push(normalizedUsername);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(bio || null);
    }
    if (color) {
      updates.push(`avatar_color = $${paramIndex++}`);
      values.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, bio, avatar, avatar_color, display_name, role, created_at`,
      values,
    );

    const user = result.rows[0];

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        avatar_color: user.avatar_color,
        display_name: user.display_name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    // Get current password hash
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // If user has no password (OAuth-only), still allow setting one
    if (user.password_hash) {
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [passwordHash, userId]
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required to delete account" });
    }

    // Verify password before deletion
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (user.password_hash) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Incorrect password" });
      }
    }

    // Permanently delete user — all related data (posts, resources, events,
    // group memberships, scan jobs, comments, notifications, sessions, etc.)
    // cascade automatically via ON DELETE CASCADE foreign key constraints.
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    // Clear auth cookie with same options used when it was set
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get active sessions
const getSessions = async (req, res) => {
  try {
    const userId = req.userId;
    const currentTokenHash = req.tokenHash;

    const result = await pool.query(
      "SELECT id, device, ip_address, created_at, last_seen, token_hash FROM user_sessions WHERE user_id = $1 AND is_revoked = false ORDER BY last_seen DESC",
      [userId]
    );

    const sessions = result.rows.map(row => ({
      id: row.id,
      device: row.device || "Unknown Device",
      ip: row.ip_address || "Unknown",
      ts: new Date(row.last_seen || row.created_at).getTime(),
      createdAt: new Date(row.created_at).getTime(),
      current: row.token_hash === currentTokenHash,
    }));

    res.status(200).json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Revoke a session
const revokeSession = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Find the session first to get its token_hash
    const sessionResult = await pool.query(
      "SELECT token_hash FROM user_sessions WHERE id = $1 AND user_id = $2 AND is_revoked = false",
      [id, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const targetTokenHash = sessionResult.rows[0].token_hash;

    // Mark as revoked
    await pool.query(
      "UPDATE user_sessions SET is_revoked = true WHERE id = $1",
      [id]
    );

    // Emit socket event to notify client to sign out immediately
    const { emitToUser, getIO } = require("../services/socket/socketService");
    const io = getIO();
    if (io) {
      io.to(`session:${targetTokenHash}`).emit("session:force_logout", {
        sessionId: id,
        message: "Your session was revoked from another device.",
      });
    }
    emitToUser(userId, "session:revoked", { tokenHash: targetTokenHash, sessionId: id });

    res.status(200).json({ message: "Session revoked successfully" });
  } catch (error) {
    console.error("Revoke session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Revoke all other sessions except current
const revokeOtherSessions = async (req, res) => {
  try {
    const userId = req.userId;
    const currentTokenHash = req.tokenHash;

    const result = await pool.query(
      "SELECT id, token_hash FROM user_sessions WHERE user_id = $1 AND token_hash != $2 AND is_revoked = false",
      [userId, currentTokenHash]
    );

    await pool.query(
      "UPDATE user_sessions SET is_revoked = true WHERE user_id = $1 AND token_hash != $2 AND is_revoked = false",
      [userId, currentTokenHash]
    );

    const { emitToUser, getIO } = require("../services/socket/socketService");
    const io = getIO();
    for (const row of result.rows) {
      if (io) {
        io.to(`session:${row.token_hash}`).emit("session:force_logout", {
          sessionId: row.id,
          message: "All other sessions were revoked.",
        });
      }
    }
    emitToUser(userId, "session:revoked_others", { exceptTokenHash: currentTokenHash });

    res.status(200).json({ message: "All other sessions revoked successfully" });
  } catch (error) {
    console.error("Revoke other sessions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
  me,
  logout,
  googleCallback,
  completeProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getSessions,
  revokeSession,
  revokeOtherSessions,
};
