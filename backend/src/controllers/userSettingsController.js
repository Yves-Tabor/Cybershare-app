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

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
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

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
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

    const result = await pool.query(
      'SELECT id, device_label, ip_address, user_agent, created_at, last_active_at FROM sessions WHERE user_id = $1 ORDER BY last_active_at DESC',
      [userId]
    );

    // For now, we'll mark all sessions as "current" since we don't have session tracking in JWT
    // In a full implementation, you'd compare the session ID from the request
    const sessions = result.rows.map(session => ({
      ...session,
      isCurrent: false, // This would be determined by comparing with current session ID
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

    const result = await pool.query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

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

    await pool.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );

    res.status(200).json({ message: 'All sessions revoked successfully' });
  } catch (error) {
    console.error('Delete all sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get notification preferences
const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      'SELECT email_marketing, email_activity, push_messages, push_mentions FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no preferences exist yet
      return res.status(200).json({
        email_marketing: true,
        email_activity: true,
        push_messages: true,
        push_mentions: true
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update notification preferences (partial update)
const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.userId;
    const { email_marketing, email_activity, push_messages, push_mentions } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (typeof email_marketing === 'boolean') {
      updates.push(`email_marketing = $${paramCount}`);
      values.push(email_marketing);
      paramCount++;
    }

    if (typeof email_activity === 'boolean') {
      updates.push(`email_activity = $${paramCount}`);
      values.push(email_activity);
      paramCount++;
    }

    if (typeof push_messages === 'boolean') {
      updates.push(`push_messages = $${paramCount}`);
      values.push(push_messages);
      paramCount++;
    }

    if (typeof push_mentions === 'boolean') {
      updates.push(`push_mentions = $${paramCount}`);
      values.push(push_mentions);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(userId);

    // Use UPSERT to handle both insert and update
    const query = `
      INSERT INTO notification_preferences (user_id, ${updates.join(', ')})
      VALUES ($${paramCount}, ${updates.map((_, i) => `$${i + 1}`).join(', ')})
      ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}
      RETURNING email_marketing, email_activity, push_messages, push_mentions
    `;

    const result = await pool.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete account (soft delete)
const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password confirmation is required' });
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // Soft delete: set deleted_at
    await pool.query(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    // Delete all sessions immediately
    await pool.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );

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
