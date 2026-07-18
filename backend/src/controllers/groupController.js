const db = require("../config/database");
const { checkAndPruneStorage } = require("../services/storageService");
const { createNotification, NOTIFICATION_TYPES } = require("../services/notification/notificationService");

// Get all groups
const getAllGroups = async (req, res) => {
  try {
    const userId = req.userId;

    const query = `
      SELECT
        g.*,
        u.username as owner_username,
        u.id as owner_id,
        COUNT(DISTINCT gm.user_id) as member_count,

        CASE WHEN gm2.user_id IS NOT NULL THEN true ELSE false END as joined
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = $1
      GROUP BY g.id, u.username, u.id, gm2.user_id
      ORDER BY g.created_at DESC
    `;

    const result = await db.query(query, [userId || null]);
    res.json({ groups: result.rows });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

// Get a single group with posts
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get group details
    const groupQuery = `
      SELECT
        g.*,
        u.username as owner_username,
        u.id as owner_id,
        COUNT(DISTINCT gm.user_id) as member_count,
        CASE WHEN gm2.user_id IS NOT NULL THEN true ELSE false END as joined
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = $1
      WHERE g.id = $2
      GROUP BY g.id, u.username, u.id, gm2.user_id
    `;

    const groupResult = await db.query(groupQuery, [userId || null, id]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const group = groupResult.rows[0];

    // Get group members
    const membersResult = await db.query(
      `SELECT u.username
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [id],
    );
    group.members = membersResult.rows.map((r) => r.username);

    // Get group posts with likes and comments count
    const postsQuery = `
      SELECT
        gp.id, gp.group_id, gp.user_id, gp.content, gp.attachment_name, gp.attachment_type, gp.created_at, gp.updated_at,
        u.username,
        u.id as post_author_id,
        COUNT(DISTINCT gpl.id) as likes,
        COUNT(DISTINCT gpc.id) as comments,
        CASE WHEN gpl2.user_id IS NOT NULL THEN true ELSE false END as liked
      FROM group_posts gp
      LEFT JOIN users u ON gp.user_id = u.id
      LEFT JOIN group_post_likes gpl ON gp.id = gpl.group_post_id
      LEFT JOIN group_post_likes gpl2 ON gp.id = gpl2.group_post_id AND gpl2.user_id = $1
      LEFT JOIN group_post_comments gpc ON gp.id = gpc.group_post_id
      WHERE gp.group_id = $2
      GROUP BY gp.id, u.username, u.id, gpl2.user_id
      ORDER BY gp.created_at DESC
    `;

    const postsResult = await db.query(postsQuery, [userId || null, id]);

    // Get comments for each post
    const postsWithComments = await Promise.all(
      postsResult.rows.map(async (post) => {
        const commentsQuery = `
          SELECT
            gpc.*,
            u.username,
            u.id as user_id
          FROM group_post_comments gpc
          LEFT JOIN users u ON gpc.user_id = u.id
          WHERE gpc.group_post_id = $1
          ORDER BY gpc.created_at ASC
        `;
        const commentsResult = await db.query(commentsQuery, [post.id]);
        return { ...post, comments: commentsResult.rows };
      }),
    );

    res.json({ group, posts: postsWithComments });
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
};

// Create a new group
const createGroup = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const userId = req.userId;

    if (!name || !description || !category) {
      return res
        .status(400)
        .json({ error: "Name, description, and category are required" });
    }

    const validCategories = [
      "Offensive",
      "Defensive",
      "Research",
      "Bounty",
      "Learning",
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const query = `
      INSERT INTO groups (name, description, category, owner_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [name, description, category, userId]);
    const group = result.rows[0];

    // Add owner as first member
    await db.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
      [group.id, userId],
    );

    res.status(201).json({ group });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
};

// Join a group
const joinGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await db.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
      [id, userId],
    );

    res.json({ message: "Joined group successfully" });
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      return res.status(400).json({ error: "Already a member of this group" });
    }
    console.error("Error joining group:", error);
    res.status(500).json({ error: "Failed to join group" });
  }
};

// Leave a group
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Prevent the group owner from leaving — would leave the group ownerless
    const groupCheck = await db.query(
      "SELECT owner_id FROM groups WHERE id = $1",
      [id]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (groupCheck.rows[0].owner_id === userId) {
      return res.status(400).json({
        error: "Group owner cannot leave. Delete the group or transfer ownership first.",
      });
    }

    const result = await db.query(
      "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "You are not a member of this group" });
    }

    res.json({ message: "Left group successfully" });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Failed to leave group" });
  }
};

// Create a post in a group
const createGroupPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;
    const file = req.file;

    if (!content && !file) {
      return res.status(400).json({ error: "Content or file is required" });
    }

    // Check if user is a member
    const memberCheck = await db.query(
      "SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2",
      [id, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "Must be a member to post" });
    }

    let query, values;
    if (file) {
      query = `
        INSERT INTO group_posts (group_id, user_id, content, attachment_data, attachment_name, attachment_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, group_id, user_id, content, attachment_name, attachment_type, created_at, updated_at
      `;
      values = [id, userId, content || "", file.buffer, file.originalname, file.mimetype];
    } else {
      query = `
        INSERT INTO group_posts (group_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, group_id, user_id, content, attachment_name, attachment_type, created_at, updated_at
      `;
      values = [id, userId, content];
    }

    const result = await db.query(query, values);
    res.status(201).json({ post: result.rows[0] });

    // Asynchronously prune old storage if limit reached
    if (file) {
      checkAndPruneStorage().catch((err) =>
        console.error("Storage pruning background task failed:", err)
      );
    }
  } catch (error) {
    console.error("Error creating group post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
};

// Get attachment for a group post
const getGroupPostAttachment = async (req, res) => {
  try {
    const { id, postId } = req.params;
    
    const query = `SELECT attachment_data, attachment_name, attachment_type FROM group_posts WHERE id = $1 AND group_id = $2`;
    const result = await db.query(query, [postId, id]);

    if (result.rows.length === 0 || !result.rows[0].attachment_data) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const attachment = result.rows[0];
    res.setHeader("Content-Type", attachment.attachment_type);
    res.setHeader("Content-Disposition", `inline; filename="${attachment.attachment_name}"`);
    res.send(attachment.attachment_data);
  } catch (error) {
    console.error("Error fetching attachment:", error);
    res.status(500).json({ error: "Failed to fetch attachment" });
  }
};

// Like a group post
const likeGroupPost = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    const userId = req.userId;

    // Check if group exists
    const groupCheck = await db.query("SELECT 1 FROM groups WHERE id = $1", [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if post exists and belongs to this group
    const postCheck = await db.query(
      "SELECT 1 FROM group_posts WHERE id = $1 AND group_id = $2",
      [postId, groupId]
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found in this group" });
    }

    // Idempotent insert — silently ignore duplicate likes
    await db.query(
      "INSERT INTO group_post_likes (group_post_id, user_id) VALUES ($1, $2) ON CONFLICT (group_post_id, user_id) DO NOTHING",
      [postId, userId],
    );

    // Return updated like count
    const likeCountResult = await db.query(
      "SELECT COUNT(*) as count FROM group_post_likes WHERE group_post_id = $1",
      [postId]
    );
    const likeCount = parseInt(likeCountResult.rows[0].count);

    res.json({ liked: true, likeCount });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ error: "Failed to like post" });
  }
};

// Unlike a group post
const unlikeGroupPost = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    const userId = req.userId;

    // Check if group exists
    const groupCheck = await db.query("SELECT 1 FROM groups WHERE id = $1", [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if post exists and belongs to this group
    const postCheck = await db.query(
      "SELECT 1 FROM group_posts WHERE id = $1 AND group_id = $2",
      [postId, groupId]
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found in this group" });
    }

    // Idempotent delete — no-op if like doesn't exist
    await db.query(
      "DELETE FROM group_post_likes WHERE group_post_id = $1 AND user_id = $2",
      [postId, userId],
    );

    // Return updated like count
    const likeCountResult = await db.query(
      "SELECT COUNT(*) as count FROM group_post_likes WHERE group_post_id = $1",
      [postId]
    );
    const likeCount = parseInt(likeCountResult.rows[0].count);

    res.json({ liked: false, likeCount });
  } catch (error) {
    console.error("Error unliking post:", error);
    res.status(500).json({ error: "Failed to unlike post" });
  }
};

// Comment on a group post
const createGroupPostComment = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    const { content, parent_comment_id } = req.body;
    const userId = req.userId;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    // Check if group exists
    const groupCheck = await db.query("SELECT 1 FROM groups WHERE id = $1", [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member of the group
    const memberCheck = await db.query(
      "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
      [groupId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "Must be a member of the group to comment" });
    }

    // Check if post exists and belongs to this group
    const postCheck = await db.query(
      "SELECT 1 FROM group_posts WHERE id = $1 AND group_id = $2",
      [postId, groupId]
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found in this group" });
    }

    const query = `
      INSERT INTO group_post_comments (group_post_id, user_id, content, parent_comment_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      postId,
      userId,
      content,
      parent_comment_id || null,
    ]);
    res.status(201).json({ comment: result.rows[0] });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
};

// Remove a member from a group (owner only)
const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.userId;

    // Check if current user is the owner
    const groupCheck = await db.query(
      "SELECT owner_id FROM groups WHERE id = $1",
      [id],
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (groupCheck.rows[0].owner_id !== currentUserId) {
      return res
        .status(403)
        .json({ error: "Only the owner can remove members" });
    }

    // Cannot remove the owner
    if (parseInt(userId) === currentUserId) {
      return res.status(400).json({ error: "Cannot remove the owner" });
    }

    await db.query(
      "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
      [id, userId],
    );

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: "Failed to remove member" });
  }
};

// Invite a user to a group (owner only)
const inviteToGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const currentUserId = req.userId;

    // Check if current user is the owner and get group info
    const groupCheck = await db.query(
      "SELECT g.owner_id, g.name, u.username as owner_username FROM groups g JOIN users u ON g.owner_id = u.id WHERE g.id = $1",
      [id],
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (groupCheck.rows[0].owner_id !== currentUserId) {
      return res
        .status(403)
        .json({ error: "Only the owner can invite members" });
    }

    const groupName = groupCheck.rows[0].name;
    const inviterUsername = groupCheck.rows[0].owner_username;

    // Find user by email
    const userResult = await db.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const targetUserId = userResult.rows[0].id;

    // Add as member
    try {
      await db.query(
        "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
        [id, targetUserId],
      );
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "User is already a member" });
      }
      throw error;
    }

    // Send notification to invited user
    await createNotification(
      targetUserId,
      NOTIFICATION_TYPES.COMMUNITY,
      "Group Invitation",
      `You've been invited to join "${groupName}" by ${inviterUsername}`,
      parseInt(id),
    );

    res.json({ message: "User invited successfully" });
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).json({ error: "Failed to invite user" });
  }
};

// Delete a group (owner only)
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if current user is the owner
    const groupCheck = await db.query(
      "SELECT owner_id FROM groups WHERE id = $1",
      [id],
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (groupCheck.rows[0].owner_id !== currentUserId) {
      return res
        .status(403)
        .json({ error: "Only the owner can delete the group" });
    }

    await db.query("DELETE FROM groups WHERE id = $1", [id]);

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
};

module.exports = {
  getAllGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
  createGroupPost,
  getGroupPostAttachment,
  likeGroupPost,
  unlikeGroupPost,
  createGroupPostComment,
  removeMember,
  inviteToGroup,
  deleteGroup,
};
