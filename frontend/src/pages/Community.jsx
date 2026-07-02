import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import { postsAPI, groupsAPI, authAPI } from "../utils/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const ME = { handle: "you", initials: "YO", color: "#534AB7" };

const AVATAR_COLORS = [
  "#534AB7",
  "#0F6E56",
  "#993C1D",
  "#185FA5",
  "#854F0B",
  "#993556",
  "#2a6b6b",
  "#6b2a55",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function avatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ initials, color, size = 8 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0`}
      style={{ background: color, minWidth: size * 4, minHeight: size * 4 }}
    >
      {initials}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] border border-[#2a2a2a] rounded-lg text-[12px] font-mono text-[#ccc] pointer-events-none whitespace-nowrap z-[200] transition-all duration-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
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

// ─── Create Group Modal ───────────────────────────────────────────────────────

function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Research");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState([]);
  const [inviteError, setInviteError] = useState("");
  const [formError, setFormError] = useState("");
  const nameRef = useRef(null);

  const CATEGORIES = [
    { label: "Offensive", color: "#E24B4A", bg: "#2e1a1a" },
    { label: "Defensive", color: "#1D9E75", bg: "#1a2a2e" },
    { label: "Research", color: "#7F77DD", bg: "#1a1a2e" },
    { label: "Bounty", color: "#BA7517", bg: "#2e2a1a" },
    { label: "Learning", color: "#639922", bg: "#1a2e1a" },
  ];

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Enter a valid email address.");
      return;
    }
    if (invites.includes(email)) {
      setInviteError("Already added.");
      return;
    }
    setInvites((prev) => [...prev, email]);
    setInviteEmail("");
    setInviteError("");
  }

  function handleCreate() {
    if (!name.trim()) {
      setFormError("Group name is required.");
      return;
    }
    if (!description.trim()) {
      setFormError("Description is required.");
      return;
    }
    const cat = CATEGORIES.find((c) => c.label === category);
    onCreate({
      name: name.trim(),
      description: description.trim(),
      category,
      categoryColor: cat.color,
      categoryBg: cat.bg,
      invites,
    });
  }

  const selectedCat = CATEGORIES.find((c) => c.label === category);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ padding: "16px" }}
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
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7F77DD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="23" y1="11" x2="17" y2="11" />
                <line x1="20" y1="8" x2="20" y2="14" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-[#080808]">
              Create a group
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
          {/* Group name */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Group Name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFormError("");
              }}
              placeholder="e.g. Exploit Dev Circle"
              maxLength={60}
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
              }}
            />
          </div>
          <br />

          {/* Description */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFormError("");
              }}
              placeholder="What is this group about?"
              rows={3}
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors resize-none placeholder:text-silver"
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
              }}
            />
          </div>
          <br />

          {/* Category */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setCategory(cat.label)}
                  className={`rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    category === cat.label
                      ? "border-current font-semibold"
                      : "border-silver text-silver bg-transparent hover:border-white hover:text-white"
                  }`}
                  style={{
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    paddingTop: "6px",
                    paddingBottom: "6px",
                    ...(category === cat.label
                      ? {
                          color: cat.color,
                          background: cat.bg,
                          borderColor: cat.color + "55",
                        }
                      : {}),
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <br />

          {/* Invite members */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Invite Members{" "}
              <span className="text-silver normal-case tracking-normal font-normal">
                — optional
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && addInvite()}
                placeholder="colleague@example.com"
                className="flex-1 text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
                style={{
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                }}
              />
              <button
                onClick={addInvite}
                className="bg-gray border border-gray rounded-xl text-[12px] font-mono text-silver hover:text-[#080808] hover:border-gray transition-all cursor-pointer flex-shrink-0"
                style={{
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                }}
              >
                Add
              </button>
            </div>
            {inviteError && (
              <p className="text-[11px] text-[#E24B4A] font-mono mt-1.5">
                {inviteError}
              </p>
            )}

            {invites.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {invites.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1.5 bg-gray border border-gray rounded-lg text-[11px] font-mono text-silver"
                    style={{
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      paddingTop: "4px",
                      paddingBottom: "4px",
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="silver"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {email}
                    <button
                      onClick={() =>
                        setInvites((p) => p.filter((e) => e !== email))
                      }
                      className="text-silver hover:text-[#080808] transition-colors bg-transparent border-none cursor-pointer ml-0.5"
                      style={{ padding: "0" }}
                    >
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
                  background: selectedCat.bg,
                  color: selectedCat.color,
                  border: `1px solid ${selectedCat.color}22`,
                }}
              >
                {name ? name.slice(0, 2).toUpperCase() : "GR"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[13px] font-semibold text-white truncate">
                    {name || "Group name"}
                  </p>
                  <span
                    className="text-[10px] font-mono rounded-md flex-shrink-0"
                    style={{
                      background: selectedCat.bg,
                      color: selectedCat.color,
                      paddingLeft: "8px",
                      paddingRight: "8px",
                      paddingTop: "2px",
                      paddingBottom: "2px",
                    }}
                  >
                    {category}
                  </span>
                </div>
                <p className="text-[12px] text-silver leading-relaxed line-clamp-2">
                  {description || "Your description will appear here."}
                </p>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-[11px] text-white font-mono">{formError}</p>
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
            onClick={handleCreate}
            className="flex items-center gap-1.5 bg-[#080808] text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Create group
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Modal (for existing group owners) ─────────────────────────────────

function InviteModal({ group, onClose, onInvite }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState([]);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function send() {
    const e = email.trim().toLowerCase();
    if (!e) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError("Enter a valid email.");
      return;
    }
    if (sent.includes(e)) {
      setError("Already sent.");
      return;
    }
    setSent((p) => [...p, e]);
    setEmail("");
    setError("");
    onInvite(e);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ padding: "16px" }}
    >
      <div className="w-full max-w-[420px] bg-white border border-gray rounded-2xl overflow-hidden">
        <div
          className="flex items-center justify-between border-b border-[#141414]"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <div>
            <p className="text-[13px] font-semibold text-[#080808]">
              Invite to {group.name}
            </p>
            <p className="text-[10.5px] text-silver font-mono mt-0.5">
              Invitations sent by email
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#444] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
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
          className="space-y-4"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "20px",
            paddingBottom: "20px",
          }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Enter email address"
              className="flex-1 bg-[#0a0a0a] border border-silver rounded-xl text-[13px] text-[#080808] outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
              }}
            />
            <button
              onClick={send}
              className="bg-[#080808] text-white rounded-xl text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none flex-shrink-0"
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
              }}
            >
              Send
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-[#E24B4A] font-mono">{error}</p>
          )}
          {sent.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono text-silver tracking-widest uppercase">
                Sent
              </p>
              {sent.map((e) => (
                <div
                  key={e}
                  className="flex items-center gap-2 text-[12px] font-mono text-[#080808]"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1D9E75"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {e}
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          className="border-t border-[#141414] flex justify-end"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <button
            onClick={onClose}
            className="bg-gray border border-gray rounded-lg text-[12px] text-silver hover:text-[#080808] transition-colors cursor-pointer"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Group card (directory listing) ──────────────────────────────────────────

function GroupCard({ group, onJoin, onOpen }) {
  return (
    <div
      className="border border-gray rounded-2xl hover:border-gray bg-[#111]/5 transition-colors"
      style={{
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingTop: "20px",
        paddingBottom: "20px",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Group icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold flex-shrink-0"
          style={{
            background: group.categoryBg,
            color: group.categoryColor,
            border: `1px solid ${group.categoryColor}22`,
          }}
        >
          {group.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <button
              onClick={() => onOpen(group)}
              className="text-[14px] font-semibold text-white hover:text-[#ccc] transition-colors bg-transparent border-none cursor-pointer text-left"
              style={{ padding: "0" }}
            >
              {group.name}
            </button>
            <span
              className="text-[10px] font-mono rounded-md"
              style={{
                background: group.categoryBg,
                color: group.categoryColor,
                paddingLeft: "8px",
                paddingRight: "8px",
                paddingTop: "2px",
                paddingBottom: "2px",
              }}
            >
              {group.category}
            </span>
          </div>
          <p className="text-[12.5px] text-silver leading-relaxed mb-3 line-clamp-2">
            {group.description}
          </p>

          {/* Members row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {group.members.slice(0, 4).map((m, i) => (
                  <div
                    key={m}
                    className="w-5 h-5 rounded-full border border-[#080808] flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: avatarColor(m), zIndex: 4 - i }}
                  >
                    {m.slice(0, 2).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpen(group)}
                className="text-[11px] font-mono text-silver hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                style={{ paddingLeft: "0", paddingRight: "0" }}
              >
                View
              </button>
              <button
                onClick={() => onJoin(group.id)}
                className={`text-[11px] font-mono rounded-lg border transition-all cursor-pointer ${
                  group.joined
                    ? "border-[#222] text-[#444] hover:border-[#E24B4A]/50 hover:text-[#E24B4A] bg-transparent"
                    : "bg-[#7F77DD]/10 border-[#7F77DD]/40 text-[#7F77DD] hover:bg-[#7F77DD]/20"
                }`}
                style={{
                  paddingLeft: "12px",
                  paddingRight: "12px",
                  paddingTop: "6px",
                  paddingBottom: "6px",
                }}
              >
                {group.joined ? "Leave" : "Join"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post inside group ────────────────────────────────────────────────────────

function GroupPost({ post, groupId, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const inputRef = useRef(null);

  function submitComment() {
    if (!commentText.trim()) return;
    onComment(groupId, post.id, commentText.trim());
    setCommentText("");
  }

  return (
    <div
      className="border border-gray rounded-xl hover:border-gray bg-[#111]/5 transition-colors"
      style={{
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingTop: "16px",
        paddingBottom: "16px",
      }}
    >
      {/* Author */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
          style={{ background: post.color }}
        >
          {post.initials}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-[12px] font-semibold text-white"
            style={{ paddingRight: "8px" }}
          >
            {post.author}
          </span>
          <span className="text-[11px] text-silver font-mono ml-2">
            {timeAgo(post.ts)}
          </span>
        </div>
      </div>

      <p className="text-[13px] text-white leading-relaxed mb-3.5 pl-[calc(1.75rem+0.625rem)]">
        {post.body}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-4 pl-[calc(1.75rem+0.625rem)]">
        <button
          onClick={() => onLike(groupId, post.id)}
          className="flex items-center gap-1.5 text-[11.5px] bg-transparent border-none cursor-pointer transition-colors"
          style={{ color: post.liked ? "#E24B4A" : "silver" }}
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
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
          onClick={() => {
            setShowComments((v) => !v);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-1.5 text-[11.5px] text-silver hover:text-white bg-transparent border-none cursor-pointer transition-colors"
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="tabular-nums">{post.comments.length}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-4 pl-[calc(1.75rem+0.625rem)] space-y-3">
          {post.comments.length > 0 && (
            <div className="space-y-2.5 border-l border-gray pl-3">
              {post.comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ background: c.color }}
                  >
                    {c.initials}
                  </div>
                  <div className="flex-1">
                    <span
                      className="text-[11px] font-semibold text-[#888]"
                      style={{ paddingRight: "8px" }}
                    >
                      {c.author}
                    </span>
                    <span className="text-[10px] text-silver font-mono ml-1.5">
                      {timeAgo(c.ts)}
                    </span>
                    <p className="text-[12px] text-white mt-0.5 leading-relaxed">
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Comment input */}
          <div className="flex items-center gap-2 pt-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
              style={{ background: ME.color }}
            >
              {ME.initials}
            </div>
            <div
              className="flex-1 flex items-center gap-2 bg-[#0d0d0d] border border-silver rounded-lg focus-within:border-white transition-colors"
              style={{
                paddingLeft: "12px",
                paddingRight: "12px",
                paddingTop: "8px",
                paddingBottom: "8px",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent border-none outline-none text-[12px] text-white placeholder:text-silver font-mono"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="text-silver hover:text-[#7F77DD] disabled:opacity-30 transition-colors bg-transparent border-none cursor-pointer p-0 flex-shrink-0"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group detail view ────────────────────────────────────────────────────────

function GroupDetail({
  group,
  onBack,
  onLike,
  onComment,
  onPublish,
  onInvite,
  onJoin,
  isOwner,
}) {
  const [postText, setPostText] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  function handlePost() {
    if (!postText.trim()) return;
    onPublish(group.id, postText.trim());
    setPostText("");
  }

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[12px] font-mono text-silver hover:text-white transition-colors bg-transparent border-none cursor-pointer mb-6"
        style={{ padding: "0" }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All groups
      </button>
      <br />

      {/* Group header card */}
      <div
        className="border border-gray rounded-2xl mb-5 bg-[#111]/5"
        style={{
          paddingLeft: "24px",
          paddingRight: "24px",
          paddingTop: "24px",
          paddingBottom: "24px",
        }}
      >
        <div
          className="flex flex-col md:flex-row items-start justify-between gap-4"
          style={{ gap: "40px" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold flex-shrink-0"
              style={{
                background: group.categoryBg,
                color: group.categoryColor,
                border: `1px solid ${group.categoryColor}22`,
              }}
            >
              {group.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[16px] font-semibold text-white">
                  {group.name}
                </h2>
                <span
                  className="text-[10px] font-mono rounded-md"
                  style={{
                    background: group.categoryBg,
                    color: group.categoryColor,
                    paddingLeft: "8px",
                    paddingRight: "8px",
                    paddingTop: "2px",
                    paddingBottom: "2px",
                  }}
                >
                  {group.category}
                </span>
                {isOwner && (
                  <span
                    className="text-[9.5px] font-mono rounded-md bg-[#1a1a1a] text-[#555] border border-[#222]"
                    style={{
                      paddingLeft: "8px",
                      paddingRight: "8px",
                      paddingTop: "2px",
                      paddingBottom: "2px",
                    }}
                  >
                    Owner
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-silver leading-relaxed mb-3 max-w-lg">
                {group.description}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {group.members.slice(0, 5).map((m, i) => (
                    <div
                      key={m}
                      className="w-5 h-5 rounded-full border border-[#080808] flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ background: avatarColor(m), zIndex: 5 - i }}
                    >
                      {m.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-silver font-mono">
                  {group.memberCount.toLocaleString()} members
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner && (
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border border-gray text-silver hover:text-white hover:border-gray transition-all cursor-pointer bg-transparent"
                style={{
                  paddingLeft: "12px",
                  paddingRight: "12px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Invite
              </button>
            )}
            <button
              onClick={() => onJoin(group.id)}
              className={`text-[11px] font-mono rounded-lg border transition-all cursor-pointer ${
                group.joined
                  ? "border-[#222] text-[#444] hover:border-[#E24B4A]/50 hover:text-[#E24B4A] bg-transparent"
                  : "bg-[#7F77DD]/10 border-[#7F77DD]/40 text-[#7F77DD] hover:bg-[#7F77DD]/20"
              }`}
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "8px",
                paddingBottom: "8px",
              }}
            >
              {group.joined ? "Leave group" : "Join group"}
            </button>
          </div>
        </div>
      </div>
      <br />

      {/* Compose box — only for members */}
      {group.joined && (
        <div
          className="border border-gray rounded-2xl mb-4 bg-[#111]/5"
          style={{
            paddingLeft: "20px",
            paddingRight: "20px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <div className="flex gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 mt-0.5"
              style={{ background: ME.color }}
            >
              {ME.initials}
            </div>
            <div className="flex-1">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder={`Share something with ${group.name}…`}
                rows={3}
                className="w-full bg-transparent border-none outline-none text-[13px] text-white resize-none placeholder:text-silver leading-relaxed"
              />
              <div className="flex justify-end mt-2 pt-2 border-t border-gray">
                <button
                  onClick={handlePost}
                  disabled={!postText.trim()}
                  className="flex items-center gap-1.5 bg-[#080808] text-white rounded-lg text-[11.5px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    paddingLeft: "14px",
                    paddingRight: "14px",
                    paddingTop: "6px",
                    paddingBottom: "6px",
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section label */}
      <br />
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[9.5px] font-mono font-bold text-silver tracking-[0.18em] uppercase whitespace-nowrap">
          {group.posts.length} post{group.posts.length !== 1 ? "s" : ""}
        </p>
        <div className="flex-1 h-px bg-gray" />
      </div>

      {/* Posts */}
      {group.posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="gray"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-[12px] font-mono text-silver">
            No posts yet. Be the first.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {group.posts.map((post) => (
            <GroupPost
              key={post.id}
              post={post}
              groupId={group.id}
              onLike={onLike}
              onComment={onComment}
            />
          ))}
        </div>
      )}

      {showInvite && (
        <InviteModal
          group={group}
          onClose={() => setShowInvite(false)}
          onInvite={(email) => onInvite(group.id, email)}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Community() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("directory"); // "directory" | "group"
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "joined"
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [searchOpen, setSearchOpen] = useState(false);
  const toastTimer = useRef(null);
  const searchInputRef = useRef(null);
  const searchPopupRef = useRef(null);

  // Fetch current user and groups on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const userResponse = await authAPI.me();
        setCurrentUser(userResponse.user);

        const groupsResponse = await groupsAPI.getAll();
        const categoryMap = {
          Offensive: { color: "#E24B4A", bg: "#2e1a1a" },
          Defensive: { color: "#1D9E75", bg: "#1a2a2e" },
          Research: { color: "#7F77DD", bg: "#1a1a2e" },
          Bounty: { color: "#BA7517", bg: "#2e2a1a" },
          Learning: { color: "#639922", bg: "#1a2e1a" },
        };
        const transformedGroups = groupsResponse.groups.map((g) => {
          const cat = categoryMap[g.category] || {
            color: "#7F77DD",
            bg: "#1a1a2e",
          };
          return {
            id: g.id,
            name: g.name,
            description: g.description,
            category: g.category,
            categoryColor: cat.color,
            categoryBg: cat.bg,
            owner: g.owner_username,
            ownerId: g.owner_id,
            memberCount: parseInt(g.member_count) || 0,
            joined: g.joined,
            posts: [],
          };
        });
        setGroups(transformedGroups);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        if (error.message === "API request failed") {
          navigate("/#p-auth");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const isOwner = activeGroup?.ownerId === currentUser?.id;

  // Close search popup on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchPopupRef.current &&
        !searchPopupRef.current.contains(e.target) &&
        !searchInputRef.current.contains(e.target)
      ) {
        setSearchOpen(false);
      }
    }
    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      2800,
    );
  }

  async function handleJoin(id) {
    try {
      const group = groups.find((g) => g.id === id);
      if (group.joined) {
        await groupsAPI.leave(id);
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== id) return g;
            return { ...g, joined: false, memberCount: g.memberCount - 1 };
          }),
        );
        showToast(`Left ${group.name}`);
      } else {
        await groupsAPI.join(id);
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== id) return g;
            return { ...g, joined: true, memberCount: g.memberCount + 1 };
          }),
        );
        showToast(`Joined ${group.name}`);
      }
    } catch (error) {
      console.error("Failed to join/leave group:", error);
      showToast("Failed to update group membership.");
    }
  }

  async function handleLike(groupId, postId) {
    const group = groups.find((g) => g.id === groupId);
    const post = group?.posts.find((p) => p.id === postId);
    if (!group || !post) return;

    const wasLiked = post.liked;

    // Optimistic UI update — update immediately
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          posts: g.posts.map((p) => {
            if (p.id !== postId) return p;
            return {
              ...p,
              liked: !p.liked,
              likes: p.liked ? p.likes - 1 : p.likes + 1,
            };
          }),
        };
      }),
    );

    try {
      if (wasLiked) {
        await groupsAPI.unlikePost(groupId, postId);
      } else {
        await groupsAPI.likePost(groupId, postId);
      }
    } catch (error) {
      console.error("Failed to like/unlike post:", error);
      // Revert on failure
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            posts: g.posts.map((p) => {
              if (p.id !== postId) return p;
              return {
                ...p,
                liked: wasLiked,
                likes: wasLiked ? p.likes + 1 : p.likes - 1,
              };
            }),
          };
        }),
      );
      showToast("Failed to update like.");
    }
  }

  async function handleComment(groupId, postId, body) {
    try {
      await groupsAPI.createComment(groupId, postId, body);
      // Refresh the group to get updated posts with comments
      const groupResponse = await groupsAPI.getById(groupId);
      const categoryMap = {
        Offensive: { color: "#E24B4A", bg: "#2e1a1a" },
        Defensive: { color: "#1D9E75", bg: "#1a2a2e" },
        Research: { color: "#7F77DD", bg: "#1a1a2e" },
        Bounty: { color: "#BA7517", bg: "#2e2a1a" },
        Learning: { color: "#639922", bg: "#1a2e1a" },
      };
      const cat = categoryMap[groupResponse.group.category] || {
        color: "#7F77DD",
        bg: "#1a1a2e",
      };
      const transformedPosts = groupResponse.posts.map((p) => ({
        id: p.id,
        author: p.username,
        avatarColor: avatarColor(p.username),
        initials: p.username.slice(0, 2).toUpperCase(),
        body: p.content,
        likes: parseInt(p.likes) || 0,
        comments: (p.comments || []).map((c) => ({
          id: c.id,
          author: c.username,
          color: avatarColor(c.username),
          initials: c.username.slice(0, 2).toUpperCase(),
          body: c.content,
          ts: new Date(c.created_at).getTime(),
        })),
        liked: p.liked,
        ts: new Date(p.created_at).getTime(),
      }));
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, posts: transformedPosts };
        }),
      );
      showToast("Comment added.");
    } catch (error) {
      console.error("Failed to add comment:", error);
      showToast("Failed to add comment.");
    }
  }

  async function handlePublish(groupId, body) {
    try {
      await groupsAPI.createPost(groupId, body);
      // Refresh the group to get updated posts
      const groupResponse = await groupsAPI.getById(groupId);
      const categoryMap = {
        Offensive: { color: "#E24B4A", bg: "#2e1a1a" },
        Defensive: { color: "#1D9E75", bg: "#1a2a2e" },
        Research: { color: "#7F77DD", bg: "#1a1a2e" },
        Bounty: { color: "#BA7517", bg: "#2e2a1a" },
        Learning: { color: "#639922", bg: "#1a2e1a" },
      };
      const cat = categoryMap[groupResponse.group.category] || {
        color: "#7F77DD",
        bg: "#1a1a2e",
      };
      const transformedPosts = groupResponse.posts.map((p) => ({
        id: p.id,
        author: p.username,
        avatarColor: avatarColor(p.username),
        initials: p.username.slice(0, 2).toUpperCase(),
        body: p.content,
        likes: parseInt(p.likes) || 0,
        comments: (p.comments || []).map((c) => ({
          id: c.id,
          author: c.username,
          color: avatarColor(c.username),
          initials: c.username.slice(0, 2).toUpperCase(),
          body: c.content,
          ts: new Date(c.created_at).getTime(),
        })),
        liked: p.liked,
        ts: new Date(p.created_at).getTime(),
      }));
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, posts: transformedPosts };
        }),
      );
      showToast("Post published.");
    } catch (error) {
      console.error("Failed to publish post:", error);
      showToast("Failed to publish post.");
    }
  }

  async function handleCreate({
    name,
    description,
    category,
    categoryColor,
    categoryBg,
    invites,
  }) {
    try {
      await groupsAPI.create(name, description, category);
      // Refresh groups
      const groupsResponse = await groupsAPI.getAll();
      const categoryMap = {
        Offensive: { color: "#E24B4A", bg: "#2e1a1a" },
        Defensive: { color: "#1D9E75", bg: "#1a2a2e" },
        Research: { color: "#7F77DD", bg: "#1a1a2e" },
        Bounty: { color: "#BA7517", bg: "#2e2a1a" },
        Learning: { color: "#639922", bg: "#1a2e1a" },
      };
      const transformedGroups = groupsResponse.groups.map((g) => {
        const cat = categoryMap[g.category] || {
          color: "#7F77DD",
          bg: "#1a1a2e",
        };
        return {
          id: g.id,
          name: g.name,
          description: g.description,
          category: g.category,
          categoryColor: cat.color,
          categoryBg: cat.bg,
          owner: g.owner_username,
          ownerId: g.owner_id,
          memberCount: parseInt(g.member_count) || 0,
          joined: g.joined,
          posts: [],
        };
      });
      setGroups(transformedGroups);
      setShowCreate(false);
      showToast(
        `"${name}" created${invites.length ? ` · ${invites.length} invite${invites.length > 1 ? "s" : ""} sent` : ""}.`,
      );
    } catch (error) {
      console.error("Failed to create group:", error);
      showToast("Failed to create group.");
    }
  }

  async function handleInvite(groupId, email) {
    try {
      await groupsAPI.invite(groupId, email);
      showToast(`Invite sent to ${email}`);
    } catch (error) {
      console.error("Failed to invite user:", error);
      showToast("Failed to invite user.");
    }
  }

  async function handleRemoveMember(groupId, userId) {
    try {
      await groupsAPI.removeMember(groupId, userId);
      showToast("Member removed");
    } catch (error) {
      console.error("Failed to remove member:", error);
      showToast("Failed to remove member.");
    }
  }

  async function handleGroupClick(groupId) {
    try {
      setActiveGroupId(groupId);
      const groupResponse = await groupsAPI.getById(groupId);
      const categoryMap = {
        Offensive: { color: "#E24B4A", bg: "#2e1a1a" },
        Defensive: { color: "#1D9E75", bg: "#1a2a2e" },
        Research: { color: "#7F77DD", bg: "#1a1a2e" },
        Bounty: { color: "#BA7517", bg: "#2e2a1a" },
        Learning: { color: "#639922", bg: "#1a2e1a" },
      };
      const cat = categoryMap[groupResponse.group.category] || {
        color: "#7F77DD",
        bg: "#1a1a2e",
      };
      const transformedPosts = groupResponse.posts.map((p) => ({
        id: p.id,
        author: p.username,
        avatarColor: avatarColor(p.username),
        initials: p.username.slice(0, 2).toUpperCase(),
        body: p.content,
        likes: parseInt(p.likes) || 0,
        comments: (p.comments || []).map((c) => ({
          id: c.id,
          author: c.username,
          color: avatarColor(c.username),
          initials: c.username.slice(0, 2).toUpperCase(),
          body: c.content,
          ts: new Date(c.created_at).getTime(),
        })),
        liked: p.liked,
        ts: new Date(p.created_at).getTime(),
      }));
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, posts: transformedPosts };
        }),
      );
      setView("group");
    } catch (error) {
      console.error("Failed to fetch group:", error);
      showToast("Failed to load group.");
    }
  }

  const filteredGroups = groups
    .filter((g) => filter === "all" || g.joined)
    .filter(
      (g) =>
        !query.trim() ||
        g.name.toLowerCase().includes(query.toLowerCase()) ||
        g.description.toLowerCase().includes(query.toLowerCase()) ||
        g.category.toLowerCase().includes(query.toLowerCase()),
    );

  const joinedCount = groups.filter((g) => g.joined).length;

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
      <div className="bg-transparent min-h-screen">
        <div
          className="w-full max-w-[900px] mx-auto"
          style={{
            paddingLeft: "48px",
            paddingRight: "48px",
            paddingTop: "48px",
            paddingBottom: "80px",
          }}
        >
          {view === "directory" && (
            <>
              <div className="flex items-start justify-between mb-7">
                <div>
                  <h1 className="text-[18px] font-semibold text-white tracking-tight">
                    Community
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[11px] text-silver font-mono">
                      {groups.length} groups
                    </p>
                    {joinedCount > 0 && (
                      <>
                        <span className="text-gray">·</span>
                        <p className="text-[11px] text-silver font-mono">
                          {joinedCount} joined
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
                  style={{
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New group
                </button>
              </div>

              {/* Search + filter row */}
              <div className="flex gap-2.5 mb-6">
                <div className="relative flex-1">
                  <svg
                    className="absolute top-1/2 -translate-y-1/2 text-silver pointer-events-none"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ left: "14px" }}
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClick={() => setSearchOpen(true)}
                    placeholder="Search groups..."
                    className="w-full md:w-fit bg-transparent border md:border-silver border-transparent rounded-xl text-[12.5px] font-mono text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
                    style={{
                      paddingLeft: "36px",
                      paddingRight: "16px",
                      paddingTop: "10px",
                      paddingBottom: "10px",
                    }}
                  />
                  {searchOpen && query && (
                    <div
                      ref={searchPopupRef}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray rounded-xl shadow-lg z-50"
                      style={{
                        paddingLeft: "16px",
                        paddingRight: "16px",
                        paddingTop: "12px",
                        paddingBottom: "12px",
                      }}
                    >
                      <p className="text-[11px] font-mono text-[#080808]">
                        Searching:{" "}
                        <span className="font-semibold">{query}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex bg-transparent border border-silver rounded-xl overflow-hidden">
                  {["all", "joined"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-[11.5px] font-mono capitalize transition-colors cursor-pointer border-none ${
                        filter === f
                          ? "bg-white hover:bg-gray-500 text-black"
                          : "bg-transparent text-silver hover:text-blue-400"
                      }`}
                      style={{
                        paddingLeft: "16px",
                        paddingRight: "16px",
                        paddingTop: "10px",
                        paddingBottom: "10px",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <br />

              {/* Section divider */}
              <div className="flex items-center gap-3 mb-4">
                <p className="text-[9.5px] font-mono font-bold text-silver tracking-[0.18em] uppercase whitespace-nowrap">
                  {query || filter !== "all"
                    ? `${filteredGroups.length} result${filteredGroups.length !== 1 ? "s" : ""}`
                    : "All groups"}
                </p>
                <div className="flex-1 h-px bg-white" />
              </div>
              <br />

              {/* Group list */}
              {filteredGroups.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredGroups.map((g) => (
                    <GroupCard
                      key={g.id}
                      group={g}
                      onJoin={handleJoin}
                      onOpen={() => handleGroupClick(g.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="gray"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <p className="text-[12px] font-mono text-silver">
                    No groups found.
                  </p>
                  {filter === "joined" && (
                    <button
                      onClick={() => setFilter("all")}
                      className="text-[11px] font-mono text-silver hover:text-white transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
                    >
                      Browse all groups
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {view === "group" && activeGroup && (
            <GroupDetail
              group={activeGroup}
              onBack={() => {
                setView("directory");
                setActiveGroupId(null);
              }}
              onLike={handleLike}
              onComment={handleComment}
              onPublish={handlePublish}
              onInvite={handleInvite}
              onJoin={handleJoin}
              isOwner={isOwner}
            />
          )}
        </div>
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
