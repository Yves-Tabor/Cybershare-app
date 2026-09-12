const db = require("../config/database");
const { checkAndPruneStorage } = require("../services/storageService");
const {
  createNotification,
  NOTIFICATION_TYPES,
  notifyGroupCreated,
  notifyGroupInvite,
  notifyGroupMessage,
} = require("../services/notification/notificationService");
const { sendReportEmail } = require("../services/emailService");

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
        CASE WHEN gm2.user_id IS NOT NULL THEN true ELSE false END as joined,
        gm2.role as my_role
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = $1
      WHERE ($1::int IS NULL OR NOT EXISTS (
        SELECT 1 FROM group_bans gb WHERE gb.group_id = g.id AND gb.user_id = $1
      ))
      GROUP BY g.id, u.username, u.id, gm2.user_id, gm2.role
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

    // Check if user is banned from this group
    if (userId) {
      const banCheck = await db.query(
        "SELECT 1 FROM group_bans WHERE group_id = $1 AND user_id = $2",
        [id, userId]
      );
      if (banCheck.rows.length > 0) {
        return res.status(403).json({ error: "You are banned from this group" });
      }
    }

    // Get group details
    const groupQuery = `
      SELECT
        g.*,
        u.username as owner_username,
        u.id as owner_id,
        COUNT(DISTINCT gm.user_id) as member_count,
        CASE WHEN gm2.user_id IS NOT NULL THEN true ELSE false END as joined,
        gm2.role as my_role
      FROM groups g
      LEFT JOIN users u ON g.owner_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = $1
      WHERE g.id = $2
      GROUP BY g.id, u.username, u.id, gm2.user_id, gm2.role
    `;

    const groupResult = await db.query(groupQuery, [userId || null, id]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const group = groupResult.rows[0];

    // Get group members with roles
    const membersResult = await db.query(
      `SELECT u.id, u.username, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY
         CASE
           WHEN gm.role = 'owner' THEN 1
           WHEN gm.role = 'admin' THEN 2
           ELSE 3
         END,
         gm.joined_at ASC`,
      [id],
    );
    group.members = membersResult.rows.map((r) => r.username);
    group.memberDetails = membersResult.rows;

    let currentUserRole = null;
    if (userId) {
      const currentMember = membersResult.rows.find((m) => m.id === userId);
      if (currentMember) {
        currentUserRole = currentMember.role;
      }
    }
    group.currentUserRole = currentUserRole;

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

    // Add owner as first member with 'owner' role
    await db.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'owner')",
      [group.id, userId],
    );

    // Get creator username and all other users to broadcast group creation
    const creatorResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    const creatorUsername = creatorResult.rows[0]?.username || 'Someone';
    const allUsersResult = await db.query('SELECT id FROM users WHERE id != $1 AND deleted_at IS NULL', [userId]);
    const otherUserIds = allUsersResult.rows.map(r => r.id);
    if (otherUserIds.length > 0) {
      notifyGroupCreated(otherUserIds, group.id, group.name, creatorUsername).catch(() => {});
    }

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

    // Check if user is banned from this group
    const banCheck = await db.query(
      "SELECT 1 FROM group_bans WHERE group_id = $1 AND user_id = $2",
      [id, userId]
    );
    if (banCheck.rows.length > 0) {
      return res.status(403).json({ error: "You are banned from this group and cannot join" });
    }

    await db.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')",
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
    const newPost = result.rows[0];
    res.status(201).json({ post: newPost });

    // Asynchronously notify group members (except poster) of new message
    setImmediate(async () => {
      try {
        const posterResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
        const posterUsername = posterResult.rows[0]?.username || 'Someone';
        const groupInfoResult = await db.query('SELECT name FROM groups WHERE id = $1', [id]);
        const groupName = groupInfoResult.rows[0]?.name || 'the group';
        const membersResult = await db.query(
          'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2',
          [id, userId]
        );
        const memberIds = membersResult.rows.map(r => r.user_id);
        if (memberIds.length > 0) {
          await notifyGroupMessage(memberIds, parseInt(id), groupName, newPost.id, posterUsername);
        }
      } catch (err) {
        console.error('Background group message notify failed:', err.message);
      }
      // Asynchronously prune old storage if limit reached
      if (file) {
        checkAndPruneStorage().catch((err) =>
          console.error("Storage pruning background task failed:", err)
        );
      }
    });
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

// Invite a user to a group (Creator or Appointed Admin only)
const inviteToGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const currentUserId = req.userId;

    // Check if current user is owner or appointed admin
    const roleCheck = await db.query(
      `SELECT g.owner_id, g.name, u.username as inviter_username, gm.role
       FROM groups g
       LEFT JOIN users u ON u.id = $1
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       WHERE g.id = $2`,
      [currentUserId, id],
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const groupInfo = roleCheck.rows[0];
    const isOwner = groupInfo.owner_id === currentUserId;
    const isAdmin = groupInfo.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Only admins can invite members to this group" });
    }

    const groupName = groupInfo.name;
    const inviterUsername = groupInfo.inviter_username || "An admin";

    // Find user by email
    const userResult = await db.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found with this email" });
    }

    const targetUserId = userResult.rows[0].id;

    // Check if target user is banned
    const banCheck = await db.query(
      "SELECT 1 FROM group_bans WHERE group_id = $1 AND user_id = $2",
      [id, targetUserId]
    );
    if (banCheck.rows.length > 0) {
      return res.status(400).json({ error: "This user has been banned from this group" });
    }

    // Add as member
    try {
      await db.query(
        "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')",
        [id, targetUserId],
      );
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "User is already a member" });
      }
      throw error;
    }

    // Send GROUP_INVITE notification to invited user
    await notifyGroupInvite(targetUserId, parseInt(id), groupName, inviterUsername);

    res.json({ message: "User invited successfully" });
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).json({ error: "Failed to invite user" });
  }
};

// Update a member's role (Creator / Main Admin only)
const updateMemberRole = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.userId;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ error: "Role must be 'admin' or 'member'" });
    }

    const groupCheck = await db.query(
      "SELECT owner_id, name FROM groups WHERE id = $1",
      [id]
    );
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (groupCheck.rows[0].owner_id !== currentUserId) {
      return res.status(403).json({ error: "Only the group creator (main admin) can name or unname admins" });
    }

    if (parseInt(userId, 10) === currentUserId) {
      return res.status(400).json({ error: "Cannot change the creator's role" });
    }

    const memberCheck = await db.query(
      "SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2",
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: "Member not found in this group" });
    }

    await db.query(
      "UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3",
      [role, id, userId]
    );

    const groupName = groupCheck.rows[0].name;
    const title = role === "admin" ? "Promoted to Admin" : "Admin Privileges Removed";
    const msg = role === "admin"
      ? `You are now an Admin in "${groupName}"`
      : `Your Admin privileges were removed in "${groupName}"`;

    await createNotification(
      parseInt(userId, 10),
      NOTIFICATION_TYPES.COMMUNITY,
      title,
      msg,
      parseInt(id, 10)
    );

    res.json({ message: `Member role updated to ${role} successfully` });
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ error: "Failed to update member role" });
  }
};

// Ban a user from the group (Creator or Appointed Admin)
const banMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { reason } = req.body;
    const currentUserId = req.userId;

    const groupCheck = await db.query(
      `SELECT g.owner_id, g.name, gm.role as caller_role
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       WHERE g.id = $2`,
      [currentUserId, id]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const group = groupCheck.rows[0];
    const isOwner = group.owner_id === currentUserId;
    const isAdmin = group.caller_role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Only admins can ban members" });
    }

    const targetId = parseInt(userId, 10);
    if (targetId === currentUserId) {
      return res.status(400).json({ error: "You cannot ban yourself" });
    }
    if (targetId === group.owner_id) {
      return res.status(400).json({ error: "Cannot ban the group creator" });
    }

    // Check target's role
    const targetCheck = await db.query(
      "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
      [id, targetId]
    );
    if (targetCheck.rows.length > 0 && targetCheck.rows[0].role === "admin" && !isOwner) {
      return res.status(403).json({ error: "Admins cannot ban other admins. Only the group creator can." });
    }

    // Remove from group_members
    await db.query(
      "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
      [id, targetId]
    );

    // Record in group_bans
    await db.query(
      `INSERT INTO group_bans (group_id, user_id, banned_by, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id, user_id)
       DO UPDATE SET banned_by = $3, reason = $4, created_at = CURRENT_TIMESTAMP`,
      [id, targetId, currentUserId, reason || "Misbehavior"]
    );

    await createNotification(
      targetId,
      NOTIFICATION_TYPES.COMMUNITY,
      "Group Notice",
      `You have been removed and banned from "${group.name}".`,
      parseInt(id, 10)
    );

    res.json({ message: "User banned from group successfully" });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ error: "Failed to ban user" });
  }
};

// Unban a user from the group (Creator or Appointed Admin)
const unbanMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.userId;

    const roleCheck = await db.query(
      `SELECT g.owner_id, gm.role
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       WHERE g.id = $2`,
      [currentUserId, id]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isOwner = roleCheck.rows[0].owner_id === currentUserId;
    const isAdmin = roleCheck.rows[0].role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Only admins can unban users" });
    }

    await db.query(
      "DELETE FROM group_bans WHERE group_id = $1 AND user_id = $2",
      [id, userId]
    );

    res.json({ message: "User unbanned successfully" });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ error: "Failed to unban user" });
  }
};

// Get list of banned users for a group (Creator or Appointed Admin)
const getGroupBans = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const roleCheck = await db.query(
      `SELECT g.owner_id, gm.role
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       WHERE g.id = $2`,
      [currentUserId, id]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isOwner = roleCheck.rows[0].owner_id === currentUserId;
    const isAdmin = roleCheck.rows[0].role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Only admins can view bans" });
    }

    const bansResult = await db.query(
      `SELECT gb.id, gb.group_id, gb.user_id, gb.reason, gb.created_at,
              u.username, u.email,
              b.username as banned_by_username
       FROM group_bans gb
       JOIN users u ON gb.user_id = u.id
       JOIN users b ON gb.banned_by = b.id
       WHERE gb.group_id = $1
       ORDER BY gb.created_at DESC`,
      [id]
    );

    res.json({ bans: bansResult.rows });
  } catch (error) {
    console.error("Error fetching group bans:", error);
    res.status(500).json({ error: "Failed to fetch bans" });
  }
};

// Report a user in a group and send email notification
const reportMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { reason, details } = req.body;
    const currentUserId = req.userId;

    if (!reason) {
      return res.status(400).json({ error: "Report reason is required" });
    }

    const groupQuery = await db.query(
      "SELECT name FROM groups WHERE id = $1",
      [id]
    );
    if (groupQuery.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const reporterQuery = await db.query("SELECT username FROM users WHERE id = $1", [currentUserId]);
    const targetQuery = await db.query("SELECT username FROM users WHERE id = $1", [userId]);

    if (targetQuery.rows.length === 0) {
      return res.status(404).json({ error: "Reported user not found" });
    }

    const groupName = groupQuery.rows[0].name;
    const reporterUsername = reporterQuery.rows[0]?.username || "anonymous";
    const reportedUsername = targetQuery.rows[0].username;

    // Save report in database
    await db.query(
      `INSERT INTO group_reports (group_id, reporter_id, reported_user_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, currentUserId, userId, reason, details || null]
    );

    // Dispatch email notification asynchronously (non-blocking) so user experience is instant
    sendReportEmail({
      groupName,
      reporterUsername,
      reportedUsername,
      reason,
      details,
    }).catch((err) => {
      console.error("[reportMember] Background email error:", err.message);
    });

    return res.json({ message: "Report submitted successfully. Incident report dispatched." });
  } catch (error) {
    console.error("Error reporting member:", error);
    res.status(500).json({ error: "Failed to report member" });
  }
};

// Delete a post in a group (Creator or Appointed Admin only)
const deleteGroupPost = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    const currentUserId = req.userId;

    const roleCheck = await db.query(
      `SELECT g.owner_id, gm.role
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       WHERE g.id = $2`,
      [currentUserId, groupId]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isOwner = roleCheck.rows[0].owner_id === currentUserId;
    const isAdmin = roleCheck.rows[0].role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Only admins can delete messages and posts" });
    }

    const result = await db.query(
      "DELETE FROM group_posts WHERE id = $1 AND group_id = $2 RETURNING id",
      [postId, groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found in this group" });
    }

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting group post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

// Delete a comment on a group post (Creator or Appointed Admin only)
const deleteGroupPostComment = async (req, res) => {
  try {
    const { groupId, postId, commentId } = req.params;
    const currentUserId = req.userId;

    const roleCheck = await db.query(
      `SELECT g.owner_id, gm.role
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
       WHERE g.id = $2`,
      [currentUserId, groupId]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isOwner = roleCheck.rows[0].owner_id === currentUserId;
    const isAdmin = roleCheck.rows[0].role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Only admins can delete comments" });
    }

    const result = await db.query(
      "DELETE FROM group_post_comments WHERE id = $1 AND group_post_id = $2 RETURNING id",
      [commentId, postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
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
  updateMemberRole,
  banMember,
  unbanMember,
  getGroupBans,
  reportMember,
  deleteGroupPost,
  deleteGroupPostComment,
  deleteGroup,
};
