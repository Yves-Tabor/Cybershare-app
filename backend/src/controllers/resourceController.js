const pool = require('../config/database');

// Get all resources
const getAllResources = async (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT r.id, r.title, r.description, r.url, r.category, r.created_at,
             u.id as user_id, u.username, u.avatar
      FROM resources r
      JOIN users u ON r.user_id = u.id
    `;
    
    const params = [];

    if (category) {
      query += ' WHERE r.category = $1';
      params.push(category);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    const resources = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      url: row.url,
      category: row.category,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        avatar: row.avatar,
      },
    }));

    res.status(200).json({ resources });
  } catch (error) {
    console.error('Get all resources error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single resource by ID
const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.id, r.title, r.description, r.url, r.category, r.created_at,
              u.id as user_id, u.username, u.avatar
       FROM resources r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const row = result.rows[0];

    const resource = {
      id: row.id,
      title: row.title,
      description: row.description,
      url: row.url,
      category: row.category,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        avatar: row.avatar,
      },
    };

    res.status(200).json({ resource });
  } catch (error) {
    console.error('Get resource by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new resource
const createResource = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, url, category } = req.body;

    const result = await pool.query(
      `INSERT INTO resources (title, description, url, category, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, url, category, created_at`,
      [title, description, url, category, userId]
    );

    const resource = result.rows[0];

    // Get user info for response
    const userResult = await pool.query(
      'SELECT id, username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    res.status(201).json({
      message: 'Resource created successfully',
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        url: resource.url,
        category: resource.category,
        createdAt: resource.created_at,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update resource
const updateResource = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, description, url, category } = req.body;

    // Check if resource exists and belongs to user
    const existingResource = await pool.query(
      'SELECT id, user_id FROM resources WHERE id = $1',
      [id]
    );

    if (existingResource.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (existingResource.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only update your own resources' });
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
    if (url !== undefined) {
      updates.push(`url = $${paramCount}`);
      values.push(url);
      paramCount++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const query = `
      UPDATE resources
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, title, description, url, category, created_at
    `;

    const result = await pool.query(query, values);
    const resource = result.rows[0];

    // Get user info for response
    const userResult = await pool.query(
      'SELECT id, username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    res.status(200).json({
      message: 'Resource updated successfully',
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        url: resource.url,
        category: resource.category,
        createdAt: resource.created_at,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete resource
const deleteResource = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if resource exists and belongs to user
    const existingResource = await pool.query(
      'SELECT id, user_id FROM resources WHERE id = $1',
      [id]
    );

    if (existingResource.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (existingResource.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own resources' });
    }

    await pool.query('DELETE FROM resources WHERE id = $1', [id]);

    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
};
