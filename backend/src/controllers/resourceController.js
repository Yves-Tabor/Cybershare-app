const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Get all resources (including their attached files)
const getAllResources = async (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT r.id, r.title, r.description, r.url, r.category, r.created_at,
             u.id as user_id, u.username, u.avatar
      FROM resources r
      JOIN users u ON r.user_id = u.id
      WHERE r.category != 'Link'
    `;
    const params = [];
    if (category) {
      query += ' AND r.category = $1';
      params.push(category);
    }
    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    const resources = await Promise.all(
      result.rows.map(async (row) => {
        const filesResult = await pool.query(
          'SELECT id, originalname, mimetype, size FROM resource_files WHERE resource_id = $1 ORDER BY created_at ASC',
          [row.id]
        );
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          url: row.url,
          category: row.category,
          createdAt: row.created_at,
          user: { id: row.user_id, username: row.username, avatar: row.avatar },
          files: filesResult.rows.map((f) => ({
            id: f.id,
            name: f.originalname,
            type: f.mimetype,
            size: formatBytes(f.size),
          })),
        };
      })
    );

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
    const filesResult = await pool.query(
      'SELECT id, originalname, mimetype, size FROM resource_files WHERE resource_id = $1 ORDER BY created_at ASC',
      [row.id]
    );

    const resource = {
      id: row.id,
      title: row.title,
      description: row.description,
      url: row.url,
      category: row.category,
      createdAt: row.created_at,
      user: { id: row.user_id, username: row.username, avatar: row.avatar },
      files: filesResult.rows.map((f) => ({
        id: f.id,
        name: f.originalname,
        type: f.mimetype,
        size: formatBytes(f.size),
      })),
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
        files: [],
        user: { id: user.id, username: user.username, avatar: user.avatar },
      },
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload a file attachment to a resource
const uploadFile = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, user_id FROM resources WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only attach files to your own resources' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { filename, originalname, mimetype, size } = req.file;

    const result = await pool.query(
      `INSERT INTO resource_files (resource_id, filename, originalname, mimetype, size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, originalname, mimetype, size`,
      [id, filename, originalname, mimetype, size]
    );

    const file = result.rows[0];
    res.status(201).json({
      file: {
        id: file.id,
        name: file.originalname,
        type: file.mimetype,
        size: formatBytes(file.size),
      },
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Download a file attachment
const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await pool.query(
      'SELECT filename, originalname, mimetype FROM resource_files WHERE id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { filename, originalname, mimetype } = result.rows[0];
    const filePath = path.join(
      __dirname, '..', 'middleware', 'uploads', 'resources', filename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', mimetype || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalname)}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update resource
const updateResource = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, description, url, category } = req.body;

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

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) { updates.push(`title = $${paramCount}`); values.push(title); paramCount++; }
    if (description !== undefined) { updates.push(`description = $${paramCount}`); values.push(description); paramCount++; }
    if (url !== undefined) { updates.push(`url = $${paramCount}`); values.push(url); paramCount++; }
    if (category !== undefined) { updates.push(`category = $${paramCount}`); values.push(category); paramCount++; }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `
      UPDATE resources SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, title, description, url, category, created_at
    `;

    const result = await pool.query(query, values);
    const resource = result.rows[0];
    const userResult = await pool.query('SELECT id, username, avatar FROM users WHERE id = $1', [userId]);
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
        user: { id: user.id, username: user.username, avatar: user.avatar },
      },
    });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete resource (and its attached files from disk)
const deleteResource = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

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

    // Remove physical files from disk
    const filesResult = await pool.query(
      'SELECT filename FROM resource_files WHERE resource_id = $1',
      [id]
    );
    for (const f of filesResult.rows) {
      const filePath = path.join(
        __dirname, '..', 'middleware', 'uploads', 'resources', f.filename
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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
  uploadFile,
  downloadFile,
  updateResource,
  deleteResource,
};
