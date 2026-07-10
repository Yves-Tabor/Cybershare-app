const pool = require('../config/database');

// Get all posts
const getAllPosts = async (req, res) => {
  try {
    const userId = req.userId;
    const query = `
      SELECT p.id, p.content, p.created_at, p.updated_at,
             COALESCE(l.like_count, 0) as likes,
             COALESCE(c.comment_count, 0) as comments,
             COALESCE(pl.user_id IS NOT NULL, false) as liked,
             u.id as user_id, u.username, u.avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as like_count
        FROM post_likes
        GROUP BY post_id
      ) l ON p.id = l.post_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) as comment_count
        FROM comments
        GROUP BY post_id
      ) c ON p.id = c.post_id
      LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = $1
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [userId || null]);

    const posts = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
      likes: parseInt(row.likes),
      comments: parseInt(row.comments),
      liked: row.liked,
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

// Like post (idempotent)
const likePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if post exists
    const postExists = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [id]
    );

    if (postExists.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Insert like, ignore if already exists (idempotent)
    await pool.query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT (post_id, user_id) DO NOTHING',
      [id, userId]
    );

    // Get updated like count
    const likeCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1',
      [id]
    );

    const likeCount = parseInt(likeCountResult.rows[0].count);

    res.status(200).json({ liked: true, likeCount });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unlike post (idempotent)
const unlikePost = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Delete like if exists (no-op if it doesn't)
    await pool.query(
      'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Get updated like count
    const likeCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1',
      [id]
    );

    const likeCount = parseInt(likeCountResult.rows[0].count);

    res.status(200).json({ liked: false, likeCount });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get like status for a post (for current user)
const getLikeStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if post exists
    const postExists = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [id]
    );

    if (postExists.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get like count
    const likeCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1',
      [id]
    );

    const likeCount = parseInt(likeCountResult.rows[0].count);

    // Check if current user liked this post
    const userLikeResult = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [id, userId || null]
    );

    const liked = userLikeResult.rows.length > 0;

    res.status(200).json({ liked, likeCount });
  } catch (error) {
    console.error('Get like status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getLikeStatus,
};
