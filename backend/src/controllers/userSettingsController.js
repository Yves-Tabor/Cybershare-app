const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Helper function to parse user agent into readable device label
function parseUserAgent(userAgent) {
  if (!userAgent) return 'Unknown Device';
  
  const ua = userAgent.toLowerCase();
  let device = 'Unknown';
  let browser = 'Unknown';
  
  // Detect browser
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';
  
  // Detect OS
  if (ua.includes('windows')) device = 'Windows';
  else if (ua.includes('mac')) device = 'Mac';
  else if (ua.includes('linux')) device = 'Linux';
  else if (ua.includes('android')) device = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) device = 'iOS';
  
  return `${browser} on ${device}`;
}

// Update display name
const updateDisplayName = async (req, res) => {
  try {
    const userId = req.userId;
    const { displayName } = req.body;

    if (!displayName || typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Display name is required' });
    }

    if (displayName.length < 1 || displayName.length > 50) {
      return res.status(400).json({ error: 'Display name must be between 1 and 50 characters' });
    }

    const result = await pool.query(
      'UPDATE users SET display_name = $1 WHERE id = $2 RETURNING id, username, email, display_name, avatar_color, avatar, bio',
      [displayName, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update display name error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update avatar color
const updateAvatarColor = async (req, res) => {
  try {
    const userId = req.userId;
    const { avatarColor } = req.body;

    if (!avatarColor || typeof avatarColor !== 'string') {
      return res.status(400).json({ error: 'Avatar color is required' });
    }

    // Validate hex color format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(avatarColor)) {
      return res.status(400).json({ error: 'Invalid hex color format' });
    }

    const result = await pool.query(
      'UPDATE users SET avatar_color = $1 WHERE id = $2 RETURNING id, username, email, display_name, avatar_color, avatar, bio',
      [avatarColor, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update avatar color error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Get current user
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password if the user has one
    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and password_changed_at
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Delete all other sessions for this user (security best practice)
    await pool.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );

    res.status(200).json({ message: 'Password changed successfully. All other sessions have been revoked.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      isCurrent: row.token_hash === currentTokenHash,
    }));

    res.status(200).json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a specific session
const deleteSession = async (req, res) => {
  try {
    const userId = req.userId;
    const { sessionId } = req.params;

    const sessionResult = await pool.query(
      "SELECT token_hash FROM user_sessions WHERE id = $1 AND user_id = $2 AND is_revoked = false",
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const targetTokenHash = sessionResult.rows[0].token_hash;

    await pool.query(
      "UPDATE user_sessions SET is_revoked = true WHERE id = $1",
      [sessionId]
    );

    const { emitToUser, getIO } = require("../services/socket/socketService");
    const io = getIO();
    if (io) {
      io.to(`session:${targetTokenHash}`).emit("session:force_logout", {
        sessionId,
        message: "Your session was revoked from another device.",
      });
    }
    emitToUser(userId, "session:revoked", { tokenHash: targetTokenHash, sessionId });

    res.status(200).json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete all sessions except current
const deleteAllSessions = async (req, res) => {
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

    res.status(200).json({ message: 'All sessions revoked successfully' });
  } catch (error) {
    console.error('Delete all sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get notification preferences
const getNotificationPreferences = async (req, res) => {
  const DEFAULT_PREFERENCES = {
    email_marketing: true,
    email_activity: true,
    push_messages: true,
    push_mentions: true,
    notif_scanner: true,
    notif_group_invite: true,
    notif_group_messages: true,
    notif_group_created: true,
    notif_post_activity: true,
    notif_events: true,
  };

  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT email_marketing, email_activity, push_messages, push_mentions,
              notif_scanner, notif_group_invite, notif_group_messages,
              notif_group_created, notif_post_activity, notif_events
       FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json(DEFAULT_PREFERENCES);
    }

    // Merge DB row with defaults (handles missing columns gracefully)
    res.status(200).json({ ...DEFAULT_PREFERENCES, ...result.rows[0] });
  } catch (error) {
    if (error.code === '42P01') {
      console.warn('notification_preferences table not found, returning defaults');
      return res.status(200).json(DEFAULT_PREFERENCES);
    }
    console.error('Get notification preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update notification preferences (partial update)
const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      email_marketing, email_activity, push_messages, push_mentions,
      notif_scanner, notif_group_invite, notif_group_messages,
      notif_group_created, notif_post_activity, notif_events,
    } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    const boolFields = [
      ['email_marketing', email_marketing],
      ['email_activity', email_activity],
      ['push_messages', push_messages],
      ['push_mentions', push_mentions],
      ['notif_scanner', notif_scanner],
      ['notif_group_invite', notif_group_invite],
      ['notif_group_messages', notif_group_messages],
      ['notif_group_created', notif_group_created],
      ['notif_post_activity', notif_post_activity],
      ['notif_events', notif_events],
    ];

    for (const [col, val] of boolFields) {
      if (typeof val === 'boolean') {
        updates.push(`${col} = $${paramCount}`);
        values.push(val);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(userId);

    const colNames = boolFields.filter(([, v]) => typeof v === 'boolean').map(([c]) => c);
    const colValues = values.slice(0, -1);

    const query = `
      INSERT INTO notification_preferences (user_id, ${colNames.join(', ')})
      VALUES ($${values.length}, ${colNames.map((_, i) => `$${i + 1}`).join(', ')})
      ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete account (permanent hard delete)
const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { password } = req.body;

    // Get current user
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // If user has a password, verify it before deletion
    if (user.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Password confirmation is required' });
      }
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Password is incorrect' });
      }
    }

    // Permanently delete the user — all related data (posts, resources, events,
    // group memberships, scan jobs, comments, notifications, sessions, etc.)
    // will be removed automatically via ON DELETE CASCADE foreign key constraints.
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    // Clear the auth cookie so the browser is immediately logged out
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  updateDisplayName,
  updateAvatarColor,
  changePassword,
  getSessions,
  deleteSession,
  deleteAllSessions,
  getNotificationPreferences,
  updateNotificationPreferences,
  deleteAccount,
};
