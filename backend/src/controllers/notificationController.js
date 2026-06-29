const pool = require('../config/database');
const {
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification: deleteNotificationService,
} = require('../services/notification/notificationService');

// Get all notifications for current user
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { unread_only } = req.query;

    let query = `
      SELECT id, type, title, message, related_id, is_read, created_at
      FROM notifications
      WHERE user_id = $1
    `;
    
    const params = [userId];

    if (unread_only === 'true') {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedId: row.related_id,
      isRead: row.is_read,
      createdAt: row.created_at,
    }));

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get unread count for current user
const getUnreadNotificationsCount = async (req, res) => {
  try {
    const userId = req.userId;
    const count = await getUnreadCount(userId);

    res.status(200).json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const success = await markAsRead(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const count = await markAllAsRead(userId);

    res.status(200).json({ message: `Marked ${count} notifications as read` });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const success = await deleteNotificationService(id, userId);

    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete all notifications for current user
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const query = 'DELETE FROM notifications WHERE user_id = $1';
    const result = await pool.query(query, [userId]);

    res.status(200).json({ message: `Deleted ${result.rowCount} notifications` });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
};
