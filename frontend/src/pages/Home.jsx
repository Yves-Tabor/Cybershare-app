import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import { Link } from "react-router-dom";
import { postsAPI, authAPI, commentsAPI, saveToken } from "../utils/api";
import { redirectToWelcomeAuth } from "../utils/authRedirect";

const TAGS = {
  "Threat Intel": { bg: "#1a1a2e", color: "#7F77DD" },

  Vulnerability: { bg: "#2e1a1a", color: "#E24B4A" },

  Tool: { bg: "#1a2e1a", color: "#639922" },

  Discussion: { bg: "#1a2a2e", color: "#1D9E75" },

  Resource: { bg: "#2e2a1a", color: "#BA7517" },
};

const AVATAR_COLORS = [
  "#534AB7",
  "#0F6E56",
  "#993C1D",

  "#185FA5",
  "#854F0B",
  "#993556",
];

const CATS = Object.keys(TAGS);

const PER_PAGE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  const diff = Date.now() - ts;

  const m = Math.floor(diff / 60000);

  const h = Math.floor(m / 60);

  const d = Math.floor(h / 24);

  if (d > 0) return `${d}d ago`;

  if (h > 0) return `${h}h ago`;

  if (m > 0) return `${m}m ago`;

  return "just now";
}

function formatPostContent({ title, body, cat }) {
  return `[${cat}] ${title} — ${body}`;
}

function transformPost(p) {
  const username = p.user?.username || p.username || "User";
  const rawContent = p.content || "";

  let cat = p.category || "Discussion";
  let body = rawContent;
  const catMatch = rawContent.match(/^\[([^\]]+)\]\s*(.+)$/s);
  if (catMatch) {
    cat = catMatch[1];
    body = catMatch[2];
  }

  return {
    id: p.id,
    author: username,
    avatarColor: AVATAR_COLORS[p.id % AVATAR_COLORS.length],
    initials: username.slice(0, 2).toUpperCase(),
    cat,
    body,
    likes: p.likes || 0,
    comments: p.comments || 0,
    liked: p.liked || false,
    ts: new Date(p.createdAt || p.created_at).getTime(),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostCard({
  post,
  onLike,
  likePending,
  currentUser,
  onReport,
  onSave,
  onDelete,
  onCommentAdd,
  onCommentRemove,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const menuRef = useRef(null);
  const commentInputRef = useRef(null);

  const tag = TAGS[post.cat] || TAGS["Discussion"];
  const isCreator = currentUser?.username === post.author;

  function normalizeComments(items = []) {
    return [...items]
      .map((comment) => {
        const fallbackTs = new Date(
          comment.createdAt || comment.created_at,
        ).getTime();

        return {
          ...comment,
          ts:
            typeof comment.ts === "number" && !Number.isNaN(comment.ts)
              ? comment.ts
              : fallbackTs,
        };
      })
      .sort((a, b) => b.ts - a.ts);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchComments() {
      if (showComments) {
        try {
          const data = await commentsAPI.getByPostId(post.id);
          setComments(normalizeComments(data.comments || []));
        } catch (error) {
          console.error("Failed to fetch comments:", error);
        }
      }
    }
    fetchComments();
  }, [showComments, post.id]);

  async function handleAddComment() {
    const content = commentInput.trim();
    if (!content) return;

    try {
      const response = await commentsAPI.create(post.id, content);
      const createdComment = response.comment;
      const now = Date.now();

      setComments((prev) =>
        normalizeComments([
          ...prev,
          {
            ...createdComment,
            content: createdComment?.content || content,
            createdAt: createdComment?.createdAt || new Date(now).toISOString(),
            ts: now,
            user: createdComment?.user || {
              id: currentUser?.id,
              username: currentUser?.username || "You",
              avatar: currentUser?.avatar || null,
            },
          },
        ]),
      );
      setCommentInput("");
      if (onCommentAdd) onCommentAdd(post.id);
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await commentsAPI.delete(post.id, commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      if (onCommentRemove) onCommentRemove(post.id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  }

  return (
    <div
      className="rounded-2xl p-4 border-b-1 border-t-1 border-[#222] transition-colors"
      style={{ padding: "10px" }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
          style={{ background: post.avatarColor }}
        >
          {post.initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white leading-tight">
                {post.author}
              </div>
              <div className="text-[11px] text-[#555] mt-0.5">
                {timeAgo(post.ts)}
              </div>
            </div>
            <span
              className="text-[11px] rounded-md font-medium flex-shrink-0 tracking-wide"
              style={{
                paddingLeft: "10px",
                paddingRight: "10px",
                paddingTop: "4px",
                paddingBottom: "4px",
                background: tag.bg,
                color: tag.color,
              }}
            >
              {post.cat}
            </span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-[#555] hover:text-white bg-transparent border-none cursor-pointer transition-colors p-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-10 min-w-[140px]">
                  {!isCreator && (
                    <>
                      <button
                        onClick={() => {
                          onReport(post.id);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left text-[12px] text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors cursor-pointer border-none px-3 py-2"
                      >
                        Report post
                      </button>
                      <button
                        onClick={() => {
                          onSave(post.id);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left text-[12px] text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors cursor-pointer border-none px-3 py-2"
                      >
                        Save post
                      </button>
                    </>
                  )}
                  {isCreator && (
                    <button
                      onClick={() => {
                        onDelete(post.id);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left text-[12px] text-[#E24B4A] hover:bg-[#2a2a2a] transition-colors cursor-pointer border-none px-3 py-2"
                    >
                      Delete post
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <p className="text-[13.5px] text-[#b0b3b8] leading-[1.65] mb-4 text-center">
            {post.body}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => onLike(post.id)}
              disabled={likePending}
              className="flex items-center gap-1.5 text-[12px] bg-transparent border-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ color: post.liked ? "#E24B4A" : "#555" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill={post.liked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="tabular-nums">{post.likes}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-[12px] bg-transparent border-none cursor-pointer transition-colors"
              style={{ color: showComments ? "#E24B4A" : "#555" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="tabular-nums">{post.comments}</span>
            </button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-[#222]">
              {/* Comment Input */}
              <div className="flex gap-2 mb-4">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-white outline-none focus:border-[#444] transition-colors px-3 py-2"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentInput.trim()}
                  className="bg-[#E24B4A] text-white text-[12px] font-semibold rounded-lg px-4 py-2 border-none cursor-pointer hover:bg-[#c43d3c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </div>

              {/* Comments List */}
              <div className="flex flex-col gap-3">
                {comments.length === 0 ? (
                  <p className="text-[12px] text-[#555] text-center py-2">
                    No comments yet
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                        style={{
                          background:
                            AVATAR_COLORS[
                              comment.user.id % AVATAR_COLORS.length
                            ],
                        }}
                      >
                        {comment.user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-white">
                            {comment.user.username}
                          </span>
                          <span className="text-[10px] text-[#555]">
                            {timeAgo(comment.ts)}
                          </span>
                          {currentUser?.id === comment.user.id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-[10px] text-[#E24B4A] hover:text-[#ff6b6b] bg-transparent border-none cursor-pointer transition-colors ml-auto"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="text-[12px] text-[#b0b3b8]">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MyPostCard({ post }) {
  const tag = TAGS[post.cat] || TAGS["Discussion"];
  const parts = post.body.split(" — ");
  const title = parts.length > 1 ? parts[0] : "Post";
  const body = parts.length > 1 ? parts.slice(1).join(" — ") : post.body;

  return (
    <div
      className="border border-[#2a2a2a] rounded-2xl hover:border-[#333] bg-[#111]/5 transition-colors mb-3"
      style={{
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingTop: "20px",
        paddingBottom: "20px",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold flex-shrink-0"
          style={{
            background: tag.bg,
            color: tag.color,
            border: `1px solid ${tag.color}22`,
          }}
        >
          {post.cat.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="app-title-text text-[14px] font-semibold text-white">
              {title}
            </span>
            <span
              className="text-[10px] font-mono rounded-md"
              style={{
                background: tag.bg,
                color: tag.color,
                paddingLeft: "8px",
                paddingRight: "8px",
                paddingTop: "2px",
                paddingBottom: "2px",
              }}
            >
              {post.cat}
            </span>
          </div>
          <p className="text-[12.5px] text-[#888] leading-relaxed mb-3 line-clamp-2">
            {body}
          </p>
          <div className="flex items-center gap-4">
            <div className="text-[11px] font-mono text-[#555]">
              {timeAgo(post.ts)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#555]">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {post.likes}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#555]">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {post.comments}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    const dist = Math.abs(i - page);

    if (i === 1 || i === totalPages || dist <= 1) {
      pages.push({ type: "page", value: i });
    } else if (dist === 2) {
      pages.push({ type: "ellipsis", value: i });
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}

        disabled={page === 1}

        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#151515] border border-[#2a2a2a] text-[#777] text-[13px] cursor-pointer transition-colors hover:bg-[#1e1e1e] hover:text-white disabled:opacity-25 disabled:cursor-default"

        aria-label="Previous"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {pages.map((p, idx) =>
        p.type === "ellipsis" ? (
          <span
            key={`e-${idx}`}
            className="text-[12px] text-[#444] w-8 text-center"
          >
            …
          </span>
        ) : (
          <button
            key={p.value}

            onClick={() => onPageChange(p.value)}

            className={`flex items-center justify-center w-8 h-8 rounded-lg text-[13px] cursor-pointer transition-colors border ${
              p.value === page
                ? "bg-white text-[#080808] border-white font-semibold"
                : "bg-[#151515] border-[#2a2a2a] text-[#888] hover:bg-[#1e1e1e] hover:text-white"
            }`}
          >
            {p.value}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}

        disabled={page === totalPages}

        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#151515] border border-[#2a2a2a] text-[#777] text-[13px] cursor-pointer transition-colors hover:bg-[#1e1e1e] hover:text-white disabled:opacity-25 disabled:cursor-default"

        aria-label="Next"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

function CreatePostModal({ onClose, onSubmit }) {
  const [cat, setCat] = useState("Threat Intel");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const bodyRef = useRef(null);

  useEffect(() => {
    bodyRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit() {
    if (!body.trim()) {
      setError("Please fill in the content.");
      return;
    }
    onSubmit({ body: body.trim(), cat });
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const selectedTag = TAGS[cat] || TAGS["Threat Intel"];

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center"
      style={{ padding: "16px" }}
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-[540px] bg-white/10 md:bg-white/1 backdrop-blur-md rounded-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-white"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <div
            className="flex items-center bg-white gap-2.5 rounded-md"
            style={{ padding: "10px" }}
          >
            <div className="w-6 h-6 rounded-md bg-gray border border-gray flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="#7F77DD"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="app-title-text text-[13px] font-semibold text-[#080808]">
              Create a post
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            style={{ padding: "4px" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          className="space-y-5 max-h-[75vh] overflow-y-auto"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "24px",
            paddingBottom: "24px",
          }}
        >
          {/* Category */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => {
                const cTag = TAGS[c];
                return (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${cat === c ? "border-current font-semibold" : "border-silver text-silver bg-transparent hover:border-white hover:text-white"}`}
                    style={{
                      paddingLeft: "12px",
                      paddingRight: "12px",
                      paddingTop: "6px",
                      paddingBottom: "6px",
                      ...(cat === c
                        ? {
                            color: cTag.color,
                            background: cTag.bg,
                            borderColor: cTag.color + "55",
                          }
                        : {}),
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <br />

          {/* Content */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Content
            </label>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setError("");
              }}
              placeholder="Share something with the community…"
              rows={5}
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors resize-none placeholder:text-silver"
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
                background: "transparent",
              }}
            />
          </div>
          <br />

          {/* Preview */}
          <div
            className="border border-gray rounded-xl bg-gray"
            style={{ padding: "16px" }}
          >
            <p className="text-[9.5px] font-mono text-silver tracking-[0.15em] uppercase mb-3">
              Preview
            </p>
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{
                  background: selectedTag.bg,
                  color: selectedTag.color,
                  border: `1px solid ${selectedTag.color}22`,
                }}
              >
                {cat.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-mono rounded-md flex-shrink-0"
                    style={{
                      background: selectedTag.bg,
                      color: selectedTag.color,
                      paddingLeft: "8px",
                      paddingRight: "8px",
                      paddingTop: "2px",
                      paddingBottom: "2px",
                    }}
                  >
                    {cat}
                  </span>
                </div>
                <p className="text-[12px] text-silver leading-relaxed line-clamp-2">
                  {body || "Your post content will appear here."}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-[11px] text-[#E24B4A] font-mono">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2.5 border-t border-white bg-white/10"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <button
            onClick={onClose}
            className="bg-transparent border border-white rounded-lg text-[12px] text-white hover:text-silver transition-colors cursor-pointer"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 bg-[#080808] text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteProfileModal({ onClose, onSubmit }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    usernameRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit() {
    setError("");
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError("Password must contain at least one special character.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    onSubmit({ username: username.trim(), password });
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center"
      style={{ padding: "16px" }}
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-[540px] bg-white/10 md:bg-white/1 backdrop-blur-md rounded-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-white"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <div
            className="flex items-center bg-white gap-2.5 rounded-md"
            style={{ padding: "10px" }}
          >
            <div className="w-6 h-6 rounded-md bg-gray border border-gray flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="#7F77DD"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="app-title-text text-[13px] font-semibold text-[#080808]">
              Complete your profile
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            style={{ padding: "4px" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          className="space-y-5 max-h-[75vh] overflow-y-auto"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "24px",
            paddingBottom: "24px",
          }}
        >
          {/* Username */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Username
            </label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="Choose a username…"
              maxLength={30}
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
                background: "transparent",
              }}
            />
          </div>
          <br />

          {/* Password */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Create a password…"
                className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver pr-10"
                style={{
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                  background: "transparent",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-silver hover:text-white bg-transparent border-none cursor-pointer"
              >
                {showPassword ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <br />

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                placeholder="Confirm your password…"
                className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver pr-10"
                style={{
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                  background: "transparent",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-silver hover:text-white bg-transparent border-none cursor-pointer"
              >
                {showConfirmPassword ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[11px] text-[#E24B4A] font-mono">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2.5 border-t border-white bg-white/10"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <button
            onClick={onClose}
            className="bg-transparent border border-white rounded-lg text-[12px] text-white hover:text-silver transition-colors cursor-pointer"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 bg-[#080808] text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Complete Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1e1e1e] border border-[#333] rounded-lg text-[13px] text-[#e0e0e0] pointer-events-none whitespace-nowrap z-[200] transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingTop: "10px",
        paddingBottom: "10px",
      }}
    >
      {message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [completeProfileOpen, setCompleteProfileOpen] = useState(false);
  const [view, setView] = useState("all");
  const [toast, setToast] = useState({ message: "", visible: false });
  const [pendingLikes, setPendingLikes] = useState({});
  const feedRef = useRef(null);
  const toastTimer = useRef(null);
  const pendingLikeIdsRef = useRef(new Set());

  // Check for OAuth token and profile completion flag on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get("token");
    if (oauthToken) {
      saveToken(oauthToken);
    }
    if (urlParams.get("complete_profile") === "true") {
      setCompleteProfileOpen(true);
    }
    if (oauthToken || urlParams.get("complete_profile")) {
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch current user and posts on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const userResponse = await authAPI.me();
        setCurrentUser(userResponse.user);

        const data = await postsAPI.getAll();
        const transformedPosts = data.posts
          .map(transformPost)
          .sort((a, b) => b.ts - a.ts);
        setPosts(transformedPosts);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        if (error.status === 401 || error.message === "API request failed") {
          redirectToWelcomeAuth(navigate);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  const totalPages = Math.ceil(posts.length / PER_PAGE);

  const slice = posts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function showToast(message) {
    clearTimeout(toastTimer.current);

    setToast({ message, visible: true });

    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      2800,
    );
  }

  async function handleLike(id) {
    if (pendingLikeIdsRef.current.has(id)) return;

    let snapshot = null;

    setPosts((prev) => {
      const currentPost = prev.find((p) => p.id === id);
      if (!currentPost) return prev;

      snapshot = {
        liked: currentPost.liked,
        likes: currentPost.likes,
      };

      return prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1,
            }
          : p,
      );
    });

    if (!snapshot) return;

    pendingLikeIdsRef.current.add(id);
    setPendingLikes((prev) => ({ ...prev, [id]: true }));

    try {
      if (snapshot.liked) {
        await postsAPI.unlike(id);
      } else {
        await postsAPI.like(id);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                liked: snapshot.liked,
                likes: Math.max(0, snapshot.likes),
              }
            : p,
        ),
      );
      showToast("Failed to update like");
    } finally {
      pendingLikeIdsRef.current.delete(id);
      setPendingLikes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function handleCommentAdd(postId) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: p.comments + 1 } : p,
      ),
    );
  }

  function handleCommentRemove(postId) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: Math.max(0, p.comments - 1) } : p,
      ),
    );
  }

  function handleReport(postId) {
    showToast("Post reported");
  }

  function handleSave(postId) {
    showToast("Post saved");
  }

  async function handleDelete(postId) {
    try {
      await postsAPI.delete(postId);
      const data = await postsAPI.getAll();
      const transformedPosts = data.posts
        .map(transformPost)
        .sort((a, b) => b.ts - a.ts);
      setPosts(transformedPosts);
      showToast("Post deleted");
    } catch (error) {
      console.error("Failed to delete post:", error);
      showToast("Failed to delete post");
    }
  }

  function handlePageChange(p) {
    if (p < 1 || p > totalPages) return;

    setPage(p);

    feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleCreatePost({ body, cat }) {
    try {
      await postsAPI.create(`[${cat}] ${body}`);
      const data = await postsAPI.getAll();
      const transformedPosts = data.posts.map(transformPost);
      setPosts(transformedPosts.sort((a, b) => b.ts - a.ts));
      setPage(1);
      setModalOpen(false);
      showToast("Post published!");
    } catch (error) {
      console.error("Failed to create post:", error);
      showToast("Failed to publish post.");
    }
  }

  async function handleCompleteProfile({ username, password }) {
    try {
      await authAPI.completeProfile(username, password);
      setCompleteProfileOpen(false);
      showToast("Profile completed successfully!");
    } catch (error) {
      console.error("Failed to complete profile:", error);
      if (error.details) {
        const detail = error.details[0];
        showToast(`${detail.path}: ${detail.message}`);
      } else {
        showToast(error.message || "Failed to complete profile.");
      }
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-[#e0e0e0]"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          backgroundImage: `url(${mainBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center text-[#e0e0e0]"

      style={{
        fontFamily: "'DM Sans', sans-serif",

        backgroundImage: `url(${mainBg})`,

        backgroundSize: "cover",

        backgroundPosition: "center",

        backgroundAttachment: "fixed",
      }}
    >
      <div className="bg-[#080808]/5 min-h-screen">
        <div
          className="w-[375px] sm:w-[768px] lg:w-[1200px] mx-auto"
          style={{
            paddingLeft: "32px",
            paddingRight: "32px",
            paddingTop: "25px",
            paddingBottom: "80px",
          }}
        >
          {/* Top bar */}

          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[20px] font-semibold text-white tracking-tight">
              Home
            </h1>

            <button
              onClick={() => setModalOpen(true)}

              className="flex items-center gap-2 bg-transparent text-white rounded-lg text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
              style={{
                paddingLeft: "20px",
                paddingRight: "20px",
                paddingTop: "10px",
                paddingBottom: "10px",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create post
            </button>
          </div>

          {/* Quick nav */}
          <div className="flex flex-col md:flex-row gap-3 mb-8 items-center justify-between">
            <div className="flex">
              <Link to="/main/community">
                <button
                  className="flex items-center gap-2 bg-transparent rounded-lg text-[#aaa] text-[13px] font-medium cursor-pointer hover:bg-[#1a1a1a] hover:text-white hover:border-[#333] transition-all"
                  style={{
                    paddingLeft: "20px",
                    paddingRight: "20px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Community
                </button>
              </Link>

              <Link to="/main/scanner">
                <button
                  className="flex items-center gap-2 bg-transparent rounded-lg text-[#aaa] text-[13px] font-medium cursor-pointer hover:bg-[#1a1a1a] hover:text-white hover:border-[#333] transition-all"
                  style={{
                    paddingLeft: "20px",
                    paddingRight: "20px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  Scanner
                </button>
              </Link>
            </div>

            <div
              className="flex bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl gap-1"
              style={{ padding: "4px" }}
            >
              <button
                onClick={() => setView("all")}
                className={`flex items-center justify-center gap-2 rounded-lg text-[12px] font-mono transition-colors cursor-pointer border-none ${view === "all" ? "bg-white text-black" : "bg-transparent text-[#aaa] hover:text-[#fff]"}`}
                style={{ padding: "10px 16px" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                All posts
              </button>
              <button
                onClick={() => setView("my")}
                className={`flex items-center justify-center gap-2 rounded-lg text-[12px] font-mono transition-colors cursor-pointer border-none ${view === "my" ? "bg-white text-black" : "bg-transparent text-[#aaa] hover:text-[#fff]"}`}
                style={{ padding: "10px 16px" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                My posts
              </button>
            </div>
          </div>

          {view === "my" && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <p className="app-title-text text-[11px] font-semibold text-[#444] tracking-[0.12em] uppercase">
                  My Posts
                </p>
                <div className="flex-1 h-px bg-[#1a1a1a]" />
              </div>
              <div className="flex flex-col gap-3">
                {currentUser &&
                posts.filter((p) => p.author === currentUser.username).length >
                  0 ? (
                  [...posts]
                    .filter((p) => p.author === currentUser.username)
                    .sort((a, b) => b.ts - a.ts)
                    .map((post) => <MyPostCard key={post.id} post={post} />)
                ) : (
                  <div
                    className="flex flex-col items-center justify-center gap-3"
                    style={{ padding: "64px 0" }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#222"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p className="text-[12px] font-mono text-[#2a2a2a]">
                      You haven't posted anything yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "all" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <p className="text-[11px] font-semibold text-[#444] tracking-[0.12em] uppercase">
                  Recent posts
                </p>
                <div className="flex-1 h-px bg-[#1a1a1a]" />
              </div>

              <div ref={feedRef} className="flex flex-col gap-4">
                {slice.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    likePending={!!pendingLikes[post.id]}
                    currentUser={currentUser}
                    onReport={handleReport}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onCommentAdd={handleCommentAdd}
                    onCommentRemove={handleCommentRemove}
                  />
                ))}
              </div>
              <br />

              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
        <br />
      </div>

      {modalOpen && (
        <CreatePostModal
          onClose={() => setModalOpen(false)}

          onSubmit={handleCreatePost}
        />
      )}

      {completeProfileOpen && (
        <CompleteProfileModal
          onClose={() => setCompleteProfileOpen(false)}
          onSubmit={handleCompleteProfile}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
