import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";

const AVATAR_COLORS = [
  "#534AB7", "#0F6E56", "#993C1D",
  "#185FA5", "#854F0B", "#993556",
];

function getAvatarColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(username) {
  return username.slice(0, 2).toUpperCase();
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function CommentItem({ comment, onReply, depth = 0, isLight = false }) {
  const avatarColor = getAvatarColor(comment.user.username);
  const initials = getInitials(comment.user.username);

  return (
    <div
      className="flex gap-3"
      style={{ marginLeft: depth > 0 ? "32px" : "0", marginTop: depth > 0 ? "12px" : "0" }}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
        style={{ background: avatarColor }}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[12px] font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
            {comment.user.username}
          </span>
          <span className={`text-[10px] ${isLight ? "text-slate-400" : "text-[#555]"}`}>
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <p className={`text-[12.5px] leading-relaxed mb-2 ${isLight ? "text-slate-700" : "text-[#b0b3b8]"}`}>
          {comment.content}
        </p>
        <button
          onClick={() => onReply(comment.id)}
          className={`text-[11px] bg-transparent border-none cursor-pointer transition-colors ${
            isLight ? "text-slate-500 hover:text-slate-800" : "text-[#555] hover:text-[#888]"
          }`}
        >
          Reply
        </button>
      </div>
    </div>
  );
}

function CommentPopup({ isOpen, onClose, postId, postAuthor }) {
  const { isLight } = useTheme();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      // Mock data for now
      setComments([
        {
          id: 1,
          content: "Great analysis! Have you considered the impact on legacy systems?",
          user: { username: "sec_raven", avatar: null },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          parentCommentId: null,
        },
        {
          id: 2,
          content: "This is exactly what we needed. Thanks for sharing!",
          user: { username: "nullbyte", avatar: null },
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          parentCommentId: null,
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch comments when popup opens
  useEffect(() => {
    if (isOpen && postId) {
      const id = setTimeout(fetchComments, 0);
      return () => clearTimeout(id);
    }
  }, [isOpen, postId, fetchComments]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`http://localhost:5000/api/posts/${postId}/comments`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   credentials: 'include',
      //   body: JSON.stringify({
      //     content: newComment,
      //     parent_comment_id: replyTo
      //   })
      // });
      // const data = await response.json();
      
      // Mock adding comment
      const newCommentObj = {
        id: Date.now(),
        content: newComment,
        user: { username: "current_user", avatar: null },
        createdAt: new Date().toISOString(),
        parentCommentId: replyTo,
      };
      
      setComments([...comments, newCommentObj]);
      setNewComment("");
      setReplyTo(null);
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (commentId) => {
    setReplyTo(commentId);
  };

  // Build comment tree (top-level comments and their replies)
  const topLevelComments = comments.filter(c => !c.parentCommentId);
  const buildCommentTree = (parentId) => {
    return comments.filter(c => c.parentCommentId === parentId);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors ${
        isLight ? "bg-slate-900/40" : "bg-black/50"
      }`}
    >
      <div
        ref={popupRef}
        className={`rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col transition-all duration-200 ${
          isLight
            ? "bg-white border border-slate-200 text-slate-900 shadow-2xl"
            : "bg-[#141414] border border-[#222] text-[#e0e0e0] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isLight ? "border-slate-100 bg-slate-50/50" : "border-[#222]"
          }`}
        >
          <div>
            <h3 className={`text-[14px] font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
              Comments
            </h3>
            <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-[#555]"}`}>
              Post by {postAuthor}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border-none cursor-pointer ${
              isLight
                ? "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                : "bg-[#222] text-[#555] hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: "200px" }}>
          {loading && comments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className={`text-[12px] ${isLight ? "text-slate-400" : "text-[#555]"}`}>
                Loading comments...
              </p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke={isLight ? "#cbd5e1" : "#333"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className={`text-[12px] ${isLight ? "text-slate-400" : "text-[#555]"}`}>
                No comments yet. Be the first to comment!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topLevelComments.map(comment => (
                <div key={comment.id}>
                  <CommentItem comment={comment} onReply={handleReply} isLight={isLight} />
                  {buildCommentTree(comment.id).map(reply => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      onReply={handleReply}
                      depth={1}
                      isLight={isLight}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className={`p-4 border-t ${isLight ? "border-slate-100 bg-slate-50/50" : "border-[#222]"}`}>
          {replyTo && (
            <div className={`flex items-center justify-between mb-2 px-2.5 py-1.5 rounded-lg ${
              isLight ? "bg-slate-100 text-slate-700" : "bg-[#1a1a1a] text-[#888]"
            }`}>
              <span className="text-[11px]">Replying to comment...</span>
              <button
                onClick={() => setReplyTo(null)}
                className={`text-[11px] bg-transparent border-none cursor-pointer ${
                  isLight ? "text-slate-500 hover:text-slate-900" : "text-[#555] hover:text-white"
                }`}
              >
                Cancel
              </button>
            </div>
          )}
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
              className={`flex-1 rounded-lg px-3 py-2 text-[12.5px] outline-none transition-colors ${
                isLight
                  ? "bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#7F77DD]"
                  : "bg-[#1a1a1a] border border-[#222] text-white placeholder:text-[#555] focus:border-[#333]"
              }`}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="px-4 py-2 bg-[#7F77DD] hover:bg-[#6b6bc9] text-white rounded-lg text-[12px] font-semibold transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "..." : "Post"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CommentPopup;
