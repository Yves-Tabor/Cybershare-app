const pool = require('../config/database');

// Get comments for a post
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Get all comments for the post with user info
    const query = `
      SELECT c.id, c.content, c.parent_comment_id, c.created_at,
             u.id as user_id, u.username, u.avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `;

    const result = await pool.query(query, [postId]);

    const comments = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      parentCommentId: row.parent_comment_id,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        avatar: row.avatar,
      },
    }));

    res.status(200).json({ comments });
  } catch (error) {
    console.error('Get post comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create comment on a post
const createComment = async (req, res) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { content, parent_comment_id } = req.body;

    // Verify post exists
    const postResult = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If replying to a comment, verify it exists and belongs to the same post
    if (parent_comment_id) {
      const parentResult = await pool.query(
        'SELECT id, post_id FROM comments WHERE id = $1',
        [parent_comment_id]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      if (parentResult.rows[0].post_id !== parseInt(postId)) {
        return res.status(400).json({ error: 'Parent comment does not belong to this post' });
      }
    }

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content, parent_comment_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, parent_comment_id, created_at`,
      [postId, userId, content, parent_comment_id || null]
    );

    const comment = result.rows[0];

    // Get user info for response
    const userResult = await pool.query(
      'SELECT id, username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    res.status(201).json({
      message: 'Comment created successfully',
      comment: {
        id: comment.id,
        content: comment.content,
        parentCommentId: comment.parent_comment_id,
        createdAt: comment.created_at,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPostComments,
  createComment,
};
