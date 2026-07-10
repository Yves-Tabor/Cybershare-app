const express = require("express");
const router = express.Router();
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getLikeStatus,
} = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const {
  createPostSchema,
  updatePostSchema,
} = require("../validators/postValidator");

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error.errors,
    });
  }
  next();
};

// Public routes (with optional auth for personalized liked/joined status)
router.get("/", optionalAuth, getAllPosts);
router.get("/:id", optionalAuth, getPostById);

// Protected routes (require authentication)
router.post("/", authMiddleware, validate(createPostSchema), createPost);
router.patch("/:id", authMiddleware, validate(updatePostSchema), updatePost);
router.delete("/:id", authMiddleware, deletePost);
router.put("/:id/like", authMiddleware, likePost);
router.delete("/:id/like", authMiddleware, unlikePost);
router.get("/:id/like-status", optionalAuth, getLikeStatus);

module.exports = router;
