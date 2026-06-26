const pool = require('../config/database');

// Get all posts
const getAllPosts = async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.content, p.created_at, p.updated_at,
             u.id as user_id, u.username, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query);

    const posts = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        avatar: row.avatar,
      },
    }));

    res.status(200).json({ posts });
  } catch (error) {
    console.error('Get all posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single post by ID
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.id, p.content, p.created_at, p.updated_at,
              u.id as user_id, u.username, u.avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const row = result.rows[0];

    const post = {
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        username: row.username,
        avatar: row.avatar,
      },
    };

    res.status(200).json({ post });
  } catch (error) {
    console.error('Get post by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new post
const createPost = async (req, res) => {
  try {
    const userId = req.userId;
    const { content } = req.body;

    const result = await pool.query(
      `INSERT INTO posts (content, user_id)
       VALUES ($1, $2)
       RETURNING id, content, created_at, updated_at`,
      [content, userId]
    );

    const post = result.rows[0];

    // Get user info for response
    const userResult = await pool.query(
      'SELECT id, username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        id: post.id,
        content: post.content,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { content } = req.body;

    // Check if post exists and belongs to user
    const existingPost = await pool.query(
      'SELECT id, user_id FROM posts WHERE id = $1',
      [id]
    );

    if (existingPost.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only update your own posts' });
    }

    const result = await pool.query(
      `UPDATE posts
       SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, content, created_at, updated_at`,
      [content, id]
    );

    const post = result.rows[0];

    // Get user info for response
    const userResult = await pool.query(
      'SELECT id, username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    res.status(200).json({
      message: 'Post updated successfully',
      post: {
        id: post.id,
        content: post.content,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if post exists and belongs to user
    const existingPost = await pool.query(
      'SELECT id, user_id FROM posts WHERE id = $1',
      [id]
    );

    if (existingPost.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
};
