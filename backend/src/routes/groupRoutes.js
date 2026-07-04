const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const {
  getAllGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
  createGroupPost,
  likeGroupPost,
  unlikeGroupPost,
  createGroupPostComment,
  removeMember,
  inviteToGroup,
} = require("../controllers/groupController");

// Get all groups
router.get("/", optionalAuth, getAllGroups);

// Get a single group with posts
router.get("/:id", optionalAuth, getGroupById);

// Create a new group (requires auth)
router.post("/", authMiddleware, createGroup);

// Join a group (requires auth)
router.post("/:id/join", authMiddleware, joinGroup);

// Leave a group (requires auth)
router.post("/:id/leave", authMiddleware, leaveGroup);

// Create a post in a group (requires auth)
router.post("/:id/posts", authMiddleware, createGroupPost);

// Like a group post (requires auth)
router.post("/:groupId/posts/:postId/like", authMiddleware, likeGroupPost);

// Unlike a group post (requires auth)
router.delete("/:groupId/posts/:postId/like", authMiddleware, unlikeGroupPost);

// Comment on a group post (requires auth)
router.post(
  "/:groupId/posts/:postId/comments",
  authMiddleware,
  createGroupPostComment,
);

// Remove a member from a group (requires auth, owner only)
router.delete("/:id/members/:userId", authMiddleware, removeMember);

// Invite a user to a group (requires auth, owner only)
router.post("/:id/invite", authMiddleware, inviteToGroup);

module.exports = router;
