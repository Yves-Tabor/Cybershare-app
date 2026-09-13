const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const {
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
} = require("../controllers/groupController");
const {
  createGroupSchema,
  createGroupPostSchema,
  createGroupPostCommentSchema,
  inviteToGroupSchema,
} = require("../validators/groupValidator");

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: result.error.errors 
    });
  }
  next();
};

const { diagnoseEmail } = require("../services/emailService");

// Get all groups
router.get("/", optionalAuth, getAllGroups);

// SMTP diagnostic check to verify credentials and test email sending
router.get("/diagnose-email", async (req, res) => {
  try {
    const result = await diagnoseEmail();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get a single group with posts
router.get("/:id", optionalAuth, getGroupById);

// Create a new group (requires auth)
router.post("/", authMiddleware, validate(createGroupSchema), createGroup);

// Join a group (requires auth)
router.post("/:id/join", authMiddleware, joinGroup);

// Leave a group (requires auth)
router.post("/:id/leave", authMiddleware, leaveGroup);

// Create a post in a group (requires auth)
router.post("/:id/posts", authMiddleware, upload.single("attachment"), validate(createGroupPostSchema), createGroupPost);

// Delete a post in a group (requires auth, admin only)
router.delete("/:groupId/posts/:postId", authMiddleware, deleteGroupPost);

// Get attachment for a group post
router.get("/:id/posts/:postId/attachment", optionalAuth, getGroupPostAttachment);

// Like a group post (requires auth)
router.post("/:groupId/posts/:postId/like", authMiddleware, likeGroupPost);

// Unlike a group post (requires auth)
router.delete("/:groupId/posts/:postId/like", authMiddleware, unlikeGroupPost);

// Comment on a group post (requires auth)
router.post(
  "/:groupId/posts/:postId/comments",
  authMiddleware,
  validate(createGroupPostCommentSchema),
  createGroupPostComment,
);

// Delete a comment on a group post (requires auth, admin only)
router.delete("/:groupId/posts/:postId/comments/:commentId", authMiddleware, deleteGroupPostComment);

// Remove a member from a group (requires auth, owner only)
router.delete("/:id/members/:userId", authMiddleware, removeMember);

// Name/unname admin role (requires auth, creator only)
router.patch("/:id/members/:userId/role", authMiddleware, updateMemberRole);

// Ban a user from group (requires auth, admin only)
router.post("/:id/ban/:userId", authMiddleware, banMember);

// Unban a user from group (requires auth, admin only)
router.delete("/:id/ban/:userId", authMiddleware, unbanMember);

// Get banned users of group (requires auth, admin only)
router.get("/:id/bans", authMiddleware, getGroupBans);

// Report a user in group (requires auth, sends email)
router.post("/:id/report/:userId", authMiddleware, reportMember);

// Invite a user to a group (requires auth, admin only)
router.post("/:id/invite", authMiddleware, validate(inviteToGroupSchema), inviteToGroup);

// Delete a group (requires auth, owner only)
router.delete("/:id", authMiddleware, deleteGroup);

module.exports = router;
