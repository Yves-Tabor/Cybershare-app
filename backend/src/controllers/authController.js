const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Register user
const register = async (req, res) => {
  try {
    const { username, email, password, bio } = req.body;

    // Normalize username: lowercase and remove spaces
    const normalizedUsername = username.toLowerCase().replace(/\s+/g, "");

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

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user with normalized username
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, bio) VALUES ($1, $2, $3, $4) RETURNING id, username, email, bio, avatar, color, role, created_at",
      [normalizedUsername, email, passwordHash, bio || null],
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken(user.id);

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
        color: user.color,
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
      "SELECT id, username, email, password_hash, bio, avatar, color, role, created_at FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user.id);

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
        color: user.color,
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
      "SELECT id, username, email, bio, avatar, color, role, created_at FROM users WHERE id = $1",
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
        color: user.color,
        role: user.role,
        createdAt: user.created_at,
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
    res.clearCookie("token");
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
    const { username, password } = req.body;

    // Normalize username
    const normalizedUsername = username.toLowerCase().replace(/\s+/g, "");

    // Check if username is already taken
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 AND id != $2",
      [normalizedUsername, userId],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user
    const result = await pool.query(
      "UPDATE users SET username = $1, password_hash = $2 WHERE id = $3 RETURNING id, username, email, bio, avatar, color, role, created_at",
      [normalizedUsername, passwordHash, userId],
    );

    const user = result.rows[0];

    res.status(200).json({
      message: "Profile completed successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        color: user.color,
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
      values.push(bio);
    }
    if (color) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, bio, avatar, color, role, created_at`,
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
        color: user.color,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
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
};
