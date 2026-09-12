const pool = require('../../config/database');
const { emitToUser } = require('../socket/socketService');

/**
 * Notification Service
 * Centralized service for creating and managing notifications across the platform
 */

const NOTIFICATION_TYPES = {
  EVENT: 'EVENT',
  SCAN_COMPLETED: 'SCAN_COMPLETED',
  SCAN_FAILED: 'SCAN_FAILED',
  COMMUNITY: 'COMMUNITY',
  SYSTEM: 'SYSTEM',
  SECURITY_ALERT: 'SECURITY_ALERT',
  GROUP_INVITE: 'GROUP_INVITE',
  GROUP_MESSAGE: 'GROUP_MESSAGE',
  GROUP_CREATED: 'GROUP_CREATED',
  POST_COMMENT: 'POST_COMMENT',
  POST_RESHARE: 'POST_RESHARE',
};

// Maps notification type → notification_preferences column
const TYPE_TO_PREF_COL = {
  SCAN_COMPLETED: 'notif_scanner',
  SCAN_FAILED: 'notif_scanner',
  SECURITY_ALERT: 'notif_scanner',
  GROUP_INVITE: 'notif_group_invite',
  GROUP_MESSAGE: 'notif_group_messages',
  GROUP_CREATED: 'notif_group_created',
  POST_COMMENT: 'notif_post_activity',
  POST_RESHARE: 'notif_post_activity',
  EVENT: 'notif_events',
  COMMUNITY: 'notif_group_messages',
  SYSTEM: null, // always delivered
};

/**
 * Check if user has a specific notification type enabled
 */
async function isNotifEnabled(userId, type) {
  const col = TYPE_TO_PREF_COL[type];
  if (!col) return true; // SYSTEM notifications always go through
  try {
    const result = await pool.query(
      `SELECT ${col} FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return true; // default = enabled
    return result.rows[0][col] !== false;
  } catch {
    return true; // fail open
  }
}

/**
 * Create a notification for a user (preference-aware)
 */
async function createNotification(userId, type, title, message, relatedId = null) {
  try {
    const enabled = await isNotifEnabled(userId, type);
    if (!enabled) return null;

    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, type, title, message, related_id, is_read, created_at`,
      [userId, type, title, message, relatedId]
    );

    const notification = result.rows[0];

    emitToUser(userId, 'notification:new', {
      id: notification.id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedId: notification.related_id,
      isRead: notification.is_read,
      createdAt: notification.created_at,
    });

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * Create notifications for multiple users (bulk, preference-aware)
 */
async function createBulkNotifications(userIds, type, title, message, relatedId = null) {
  const notifications = [];
  for (const userId of userIds) {
    const notification = await createNotification(userId, type, title, message, relatedId);
    if (notification) notifications.push(notification);
  }
  return notifications;
}

/**
 * Mark a notification as read
 */
async function markAsRead(notificationId, userId) {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
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
 */
async function markAllAsRead(userId) {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
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
 */
async function getUnreadCount(userId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
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
 */
async function deleteNotification(notificationId, userId) {
  try {
    const result = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
}

// ─── Domain-specific helpers ──────────────────────────────────────────────────

async function notifyScanCompleted(userId, scanId, securityScore, targetUrl) {
  const title = 'Scan Completed';
  const message = `Your security scan for ${targetUrl} is complete. Security score: ${securityScore}/100.`;
  await createNotification(userId, NOTIFICATION_TYPES.SCAN_COMPLETED, title, message, scanId);
}

async function notifyScanFailed(userId, scanId, targetUrl) {
  const title = 'Scan Failed';
  const message = `Your security scan for ${targetUrl} failed. Please try again or check the target URL.`;
  await createNotification(userId, NOTIFICATION_TYPES.SCAN_FAILED, title, message, scanId);
}

async function notifySecurityAlert(userId, scanId, targetUrl, criticalIssues) {
  const title = 'Security Alert';
  const message = `Your scan of ${targetUrl} found ${criticalIssues} critical security issue(s). Review the results immediately.`;
  await createNotification(userId, NOTIFICATION_TYPES.SECURITY_ALERT, title, message, scanId);
}

/**
 * Notify all users (except creator) when a new group is created
 */
async function notifyGroupCreated(allUserIds, groupId, groupName, creatorUsername) {
  const title = 'New Community Group';
  const message = `@${creatorUsername} created a new group: "${groupName}". Join the conversation!`;
  await createBulkNotifications(allUserIds, NOTIFICATION_TYPES.GROUP_CREATED, title, message, groupId);
}

/**
 * Notify a user that they were invited to a group
 */
async function notifyGroupInvite(userId, groupId, groupName, inviterUsername) {
  const title = 'Group Invitation';
  const message = `@${inviterUsername} invited you to join the group "${groupName}".`;
  await createNotification(userId, NOTIFICATION_TYPES.GROUP_INVITE, title, message, groupId);
}

/**
 * Notify group members (excluding poster) of a new message/post
 */
async function notifyGroupMessage(memberIds, groupId, groupName, postId, authorUsername) {
  const title = 'New Group Message';
  const message = `@${authorUsername} posted in "${groupName}".`;
  // Use postId as relatedId so frontend can link to community?group=groupId
  await createBulkNotifications(memberIds, NOTIFICATION_TYPES.GROUP_MESSAGE, title, message, groupId);
}

/**
 * Notify a post author that someone commented on their post
 */
async function notifyPostComment(postOwnerId, postId, commenterUsername) {
  const title = 'New Comment';
  const message = `@${commenterUsername} commented on your post.`;
  await createNotification(postOwnerId, NOTIFICATION_TYPES.POST_COMMENT, title, message, postId);
}

/**
 * Notify a post author that someone reshared their post
 */
async function notifyPostReshare(postOwnerId, postId, resharerUsername) {
  const title = 'Post Reshared';
  const message = `@${resharerUsername} reshared your post.`;
  await createNotification(postOwnerId, NOTIFICATION_TYPES.POST_RESHARE, title, message, postId);
}

/**
 * Notify all users when a new event is created
 */
async function notifyEventCreated(userIds, eventId, eventTitle) {
  const title = 'New Event';
  const message = `A new cybersecurity event has been created: ${eventTitle}`;
  await createBulkNotifications(userIds, NOTIFICATION_TYPES.EVENT, title, message, eventId);
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
  notifySecurityAlert,
  notifyGroupCreated,
  notifyGroupInvite,
  notifyGroupMessage,
  notifyPostComment,
  notifyPostReshare,
  notifyEventCreated,
};
