const pool = require('../../config/database');

/**
 * Notification Service
 * Centralized service for creating and managing notifications across the platform
 * This service can be called from any module (scans, events, community, etc.)
 */

const NOTIFICATION_TYPES = {
  EVENT: 'EVENT',
  SCAN_COMPLETED: 'SCAN_COMPLETED',
  SCAN_FAILED: 'SCAN_FAILED',
  COMMUNITY: 'COMMUNITY',
  SYSTEM: 'SYSTEM',
  SECURITY_ALERT: 'SECURITY_ALERT',
};

/**
 * Create a notification for a user
 * @param {number} userId - The user to notify
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {number} relatedId - Optional related entity ID
 * @returns {Promise<Object>} Created notification
 */
async function createNotification(userId, type, title, message, relatedId = null) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, type, title, message, related_id, is_read, created_at`,
      [userId, type, title, message, relatedId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notifications shouldn't break the main flow
    return null;
  }
}

/**
 * Create notifications for multiple users (bulk)
 * @param {Array<number>} userIds - Array of user IDs to notify
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {number} relatedId - Optional related entity ID
 * @returns {Promise<Array>} Created notifications
 */
async function createBulkNotifications(userIds, type, title, message, relatedId = null) {
  const notifications = [];
  
  for (const userId of userIds) {
    const notification = await createNotification(userId, type, title, message, relatedId);
    if (notification) {
      notifications.push(notification);
    }
  }

  return notifications;
}

/**
 * Mark a notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
async function markAsRead(notificationId, userId) {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
async function markAllAsRead(userId) {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return result.rowCount;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return 0;
  }
}

/**
 * Get unread count for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Unread count
 */
async function getUnreadCount(userId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
async function deleteNotification(notificationId, userId) {
  try {
    const result = await pool.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
}

/**
 * Helper: Create scan completion notification
 * @param {number} userId - User ID
 * @param {number} scanId - Scan ID
 * @param {number} securityScore - Security score
 * @param {string} targetUrl - Target URL
 */
async function notifyScanCompleted(userId, scanId, securityScore, targetUrl) {
  const title = 'Scan Completed';
  const message = `Your security scan for ${targetUrl} is complete. Security score: ${securityScore}/100.`;
  await createNotification(userId, NOTIFICATION_TYPES.SCAN_COMPLETED, title, message, scanId);
}

/**
 * Helper: Create scan failed notification
 * @param {number} userId - User ID
 * @param {number} scanId - Scan ID
 * @param {string} targetUrl - Target URL
 */
async function notifyScanFailed(userId, scanId, targetUrl) {
  const title = 'Scan Failed';
  const message = `Your security scan for ${targetUrl} failed. Please try again or check the target URL.`;
  await createNotification(userId, NOTIFICATION_TYPES.SCAN_FAILED, title, message, scanId);
}

/**
 * Helper: Create event notification
 * @param {Array<number>} userIds - User IDs to notify
 * @param {number} eventId - Event ID
 * @param {string} eventTitle - Event title
 */
async function notifyEventCreated(userIds, eventId, eventTitle) {
  const title = 'New Event';
  const message = `A new cybersecurity event has been created: ${eventTitle}`;
  await createBulkNotifications(userIds, NOTIFICATION_TYPES.EVENT, title, message, eventId);
}

/**
 * Helper: Create security alert notification
 * @param {number} userId - User ID
 * @param {number} scanId - Scan ID
 * @param {string} targetUrl - Target URL
 * @param {number} criticalIssues - Number of critical issues found
 */
async function notifySecurityAlert(userId, scanId, targetUrl, criticalIssues) {
  const title = 'Security Alert';
  const message = `Your scan of ${targetUrl} found ${criticalIssues} critical security issue(s). Review the results immediately.`;
  await createNotification(userId, NOTIFICATION_TYPES.SECURITY_ALERT, title, message, scanId);
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  notifyScanCompleted,
  notifyScanFailed,
  notifyEventCreated,
  notifySecurityAlert,
};
