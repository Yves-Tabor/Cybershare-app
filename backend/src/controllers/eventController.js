const pool = require('../config/database');
const { notifyEventCreated } = require('../services/notification/notificationService');

// Helper: Check if user has admin/moderator role
async function isAdminOrModerator(userId) {
  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) return false;
    
    const role = result.rows[0].role;
    return role === 'admin' || role === 'moderator';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

// Get all events (public - no auth required)
const getAllEvents = async (req, res) => {
  try {
    const { category, status } = req.query;

    let query = `
      SELECT e.id, e.title, e.description, e.location, e.start_date, e.end_date,
             e.image_url, e.category, e.status, e.created_at, e.updated_at,
             u.id as created_by_id, u.username as created_by_username, u.avatar as created_by_avatar,
             (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count
      FROM events e
      JOIN users u ON e.created_by = u.id
    `;
    
    const params = [];
    const conditions = [];

    if (category) {
      conditions.push(`e.category = $${params.length + 1}`);
      params.push(category);
    }

    if (status) {
      conditions.push(`e.status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY e.start_date ASC';

    const result = await pool.query(query, params);

    const events = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      startDate: row.start_date,
      endDate: row.end_date,
      imageUrl: row.image_url,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: {
        id: row.created_by_id,
        username: row.created_by_username,
        avatar: row.created_by_avatar,
      },
      attendeeCount: parseInt(row.attendee_count),
    }));

    res.status(200).json({ events });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single event by ID (public - no auth required)
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT e.id, e.title, e.description, e.location, e.start_date, e.end_date,
              e.image_url, e.category, e.status, e.created_at, e.updated_at,
              u.id as created_by_id, u.username as created_by_username, u.avatar as created_by_avatar,
              (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const row = result.rows[0];

    const event = {
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      startDate: row.start_date,
      endDate: row.end_date,
      imageUrl: row.image_url,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: {
        id: row.created_by_id,
        username: row.created_by_username,
        avatar: row.created_by_avatar,
      },
      attendeeCount: parseInt(row.attendee_count),
    };

    res.status(200).json({ event });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new event (admin/moderator only)
const createEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, location, start_date, end_date, image_url, category, status } = req.body;

    // Check if user is admin or moderator
    const hasPermission = await isAdminOrModerator(userId);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins and moderators can create events' });
    }

    const result = await pool.query(
      `INSERT INTO events (title, description, location, start_date, end_date, image_url, category, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, description, location, start_date, end_date, image_url, category, status, created_at, updated_at`,
      [title, description, location, start_date, end_date, image_url, category, userId, status || 'upcoming']
    );

    const event = result.rows[0];

    // Get creator info for response
    const userResult = await pool.query(
      'SELECT id, username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    // Notify interested users (for now, notify all users - in production, this would be filtered)
    // TODO: Implement user preferences for event notifications
    const allUsersResult = await pool.query('SELECT id FROM users WHERE role = $1', ['user']);
    const userIds = allUsersResult.rows.map(row => row.id);
    
    if (userIds.length > 0) {
      await notifyEventCreated(userIds, event.id, event.title);
    }

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startDate: event.start_date,
        endDate: event.end_date,
        imageUrl: event.image_url,
        category: event.category,
        status: event.status,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        createdBy: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
        attendeeCount: 0,
      },
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update event (admin/moderator only)
const updateEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, description, location, start_date, end_date, image_url, category, status } = req.body;

    // Check if user is admin or moderator
    const hasPermission = await isAdminOrModerator(userId);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins and moderators can update events' });
    }

    // Check if event exists
    const existingEvent = await pool.query(
      'SELECT id FROM events WHERE id = $1',
      [id]
    );

    if (existingEvent.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount}`);
      values.push(location);
      paramCount++;
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramCount}`);
      values.push(start_date);
      paramCount++;
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount}`);
      values.push(end_date);
      paramCount++;
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount}`);
      values.push(image_url);
      paramCount++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, title, description, location, start_date, end_date, image_url, category, status, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const event = result.rows[0];

    // Get creator info for response
    const userResult = await pool.query(
      'SELECT id, username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    res.status(200).json({
      message: 'Event updated successfully',
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startDate: event.start_date,
        endDate: event.end_date,
        imageUrl: event.image_url,
        category: event.category,
        status: event.status,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        createdBy: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
        attendeeCount: 0,
      },
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete event (admin/moderator only)
const deleteEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if user is admin or moderator
    const hasPermission = await isAdminOrModerator(userId);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins and moderators can delete events' });
    }

    // Check if event exists
    const existingEvent = await pool.query(
      'SELECT id FROM events WHERE id = $1',
      [id]
    );

    if (existingEvent.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Register for an event
const registerForEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if event exists
    const eventResult = await pool.query(
      'SELECT id, status FROM events WHERE id = $1',
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Check if event is upcoming
    if (event.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot register for events that are not upcoming' });
    }

    // Check if already registered
    const existingRegistration = await pool.query(
      'SELECT id FROM event_attendees WHERE event_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Register
    await pool.query(
      'INSERT INTO event_attendees (event_id, user_id) VALUES ($1, $2)',
      [id, userId]
    );

    res.status(201).json({ message: 'Successfully registered for event' });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unregister from an event
const unregisterFromEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.status(200).json({ message: 'Successfully unregistered from event' });
  } catch (error) {
    console.error('Unregister from event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get event attendees (admin/moderator only)
const getEventAttendees = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if user is admin or moderator
    const hasPermission = await isAdminOrModerator(userId);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins and moderators can view event attendees' });
    }

    // Check if event exists
    const eventResult = await pool.query(
      'SELECT id FROM events WHERE id = $1',
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await pool.query(
      `SELECT ea.id, ea.registered_at,
              u.id as user_id, u.username, u.avatar
       FROM event_attendees ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1
       ORDER BY ea.registered_at ASC`,
      [id]
    );

    const attendees = result.rows.map(row => ({
      id: row.id,
      registeredAt: row.registered_at,
      user: {
        id: row.user_id,
        username: row.username,
        avatar: row.avatar,
      },
    }));

    res.status(200).json({ attendees });
  } catch (error) {
    console.error('Get event attendees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getEventAttendees,
};
