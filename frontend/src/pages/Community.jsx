import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import { groupsAPI, authAPI } from "../utils/api";
import { redirectToWelcomeAuth } from "../utils/authRedirect";

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

// ─── Invite Member Modal ──────────────────────────────────────────────────────

function InviteMemberModal({ groupName, onClose, onInvite }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState([]);
  const [inviteError, setInviteError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Please enter a valid email");
      return;
    }
    if (invites.includes(email)) {
      setInviteError("Email already added");
      return;
    }
    setInvites((prev) => [...prev, email]);
    setInviteEmail("");
    setInviteError("");
  }

  function handleSend() {
    if (invites.length === 0) return;
    setIsSubmitting(true);
    onInvite(invites);
  }

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
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <span className="app-title-text text-[13px] font-semibold text-[#080808]">
              Invite to {groupName}
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
          className="space-y-5"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "24px",
            paddingBottom: "24px",
          }}
        >
          {/* Invites */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Email Addresses
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
                className="flex-1 text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver border-b border-silver"
                style={{
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                  background: "transparent",
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
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 bg-white/5 border-t border-white"
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <button
            onClick={onClose}
            className="text-[12px] font-semibold text-silver hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "10px",
              paddingBottom: "10px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={invites.length === 0 || isSubmitting}
            className="bg-white text-[#080808] rounded-xl text-[12px] font-bold hover:bg-[#e0e0e0] transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              paddingLeft: "20px",
              paddingRight: "20px",
              paddingTop: "10px",
              paddingBottom: "10px",
            }}
          >
            {isSubmitting ? "Sending..." : `Send ${invites.length} Invite${invites.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
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

// ─── Ban Member Modal ─────────────────────────────────────────────────────────

function BanMemberModal({ targetUser, groupName, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleBan() {
    setIsSubmitting(true);
    await onConfirm(reason.trim());
    setIsSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[480px] bg-[#101017] border border-[#E24B4A]/40 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[#222232] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E24B4A]/15 border border-[#E24B4A]/30 flex items-center justify-center text-[#E24B4A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Ban Member</h3>
              <p className="text-[11px] text-silver font-mono">@{targetUser?.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-silver hover:text-white bg-transparent border-none cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[#E24B4A]/10 border border-[#E24B4A]/25 rounded-xl p-3.5 text-[12px] text-[#fca5a5] leading-relaxed">
            <strong>Warning:</strong> Banning <strong>@{targetUser?.username}</strong> will permanently remove them from <strong>{groupName}</strong>. They will <em>never</em> be able to view, search for, or access this group again.
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-silver mb-1.5">
              Reason for Ban (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Harassment, continuous spam, community rule violations"
              className="w-full bg-[#181824] border border-[#2e2e45] rounded-xl px-4 py-2.5 text-[13px] text-white outline-none focus:border-[#E24B4A] transition-colors placeholder:text-silver/50"
            />
          </div>
        </div>

        <div className="p-5 bg-[#0b0b10] border-t border-[#222232] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-[12px] font-mono text-silver hover:text-white bg-transparent border border-gray rounded-xl cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBan}
            disabled={isSubmitting}
            className="px-5 py-2 text-[12px] font-mono font-bold text-white bg-[#E24B4A] hover:bg-[#c93b3a] rounded-xl border-none cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? "Banning..." : "Confirm & Ban User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report Member Modal ──────────────────────────────────────────────────────

function ReportMemberModal({ targetUser, groupName, onClose, onSubmit }) {
  const [reason, setReason] = useState("Harassment or bullying");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const REASONS = [
    "Harassment or bullying",
    "Spam, scams or unsolicited links",
    "Malicious payloads or exploit code",
    "Hate speech or abusive language",
    "Impersonation or fraud",
    "Other violation",
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(reason, details.trim());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[500px] bg-[#101017] border border-[#f59e0b]/40 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[#222232] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Report User</h3>
              <p className="text-[11px] text-silver font-mono">@{targetUser?.username} in {groupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-silver hover:text-white bg-transparent border-none cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#181824] border border-[#2e2e45] rounded-xl p-3 text-[12px] text-silver leading-relaxed flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" className="flex-shrink-0">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span>This will securely dispatch an incident report to platform administration with your input details and context.</span>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-silver mb-1.5">
              Reason / Category
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#181824] border border-[#2e2e45] rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-[#f59e0b] transition-colors cursor-pointer"
            >
              {REASONS.map((r) => (
                <option key={r} value={r} className="bg-[#101017] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-silver mb-1.5">
              Incident Details & Evidence
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what occurred, quotes, or relevant message context..."
              className="w-full bg-[#181824] border border-[#2e2e45] rounded-xl px-4 py-2.5 text-[13px] text-white outline-none focus:border-[#f59e0b] transition-colors placeholder:text-silver/50 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-[12px] font-mono text-silver hover:text-white bg-transparent border border-gray rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-[12px] font-mono font-bold text-[#080808] bg-[#f59e0b] hover:bg-[#d97706] rounded-xl border-none cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {isSubmitting ? "Sending Email..." : "Send Email Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Manage Members Modal ─────────────────────────────────────────────────────

function ManageMembersModal({
  group,
  currentUser,
  isOwner,
  isAdmin,
  onClose,
  onUpdateRole,
  onOpenBan,
  onOpenReport,
  onUnban,
  onInvite,
}) {
  const [tab, setTab] = useState("members");
  const [search, setSearch] = useState("");
  const [bans, setBans] = useState([]);
  const [loadingBans, setLoadingBans] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    if (tab === "bans" && (isOwner || isAdmin)) {
      setLoadingBans(true);
      groupsAPI
        .getBans(group.id)
        .then((res) => setBans(res.bans || []))
        .catch((err) => console.error("Failed to fetch bans:", err))
        .finally(() => setLoadingBans(false));
    }
  }, [tab, group.id, isOwner, isAdmin]);

  const memberList =
    group.memberDetails && group.memberDetails.length > 0
      ? group.memberDetails
      : (group.members || []).map((m) => {
          const username = typeof m === "string" ? m : m.username;
          return {
            id: typeof m === "object" ? m.id : null,
            username,
            role: username === group.owner ? "owner" : "member",
          };
        });

  const filteredMembers = memberList.filter((m) =>
    (m.username || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleRoleChange(userId, newRole) {
    setActionLoadingId(userId);
    await onUpdateRole(userId, newRole);
    setActionLoadingId(null);
  }

  async function handleUnbanClick(userId) {
    setActionLoadingId(userId);
    await onUnban(userId);
    setBans((prev) => prev.filter((b) => b.user_id !== userId));
    setActionLoadingId(null);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[640px] max-h-[85vh] flex flex-col bg-[#101017] border border-gray rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#222232] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-[16px] font-semibold text-white flex items-center gap-2">
              <span>Members & Administration</span>
              <span className="text-[11px] font-mono text-[#818cf8] bg-[#818cf8]/10 px-2 py-0.5 rounded-full border border-[#818cf8]/30">
                {group.name}
              </span>
            </h3>
            <p className="text-[11px] text-silver font-mono mt-0.5">
              Creator is Main Admin. Main Admin can name/unname other Admins.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-silver hover:text-white bg-transparent border-none cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        {(isOwner || isAdmin) && (
          <div className="flex border-b border-[#222232] bg-[#0b0b10] px-5 flex-shrink-0">
            <button
              onClick={() => setTab("members")}
              className={`py-3 px-4 text-[12px] font-mono border-b-2 cursor-pointer transition-colors bg-transparent ${
                tab === "members"
                  ? "border-[#7F77DD] text-white font-bold"
                  : "border-transparent text-silver hover:text-white"
              }`}
            >
              Active Members ({memberList.length})
            </button>
            <button
              onClick={() => setTab("bans")}
              className={`py-3 px-4 text-[12px] font-mono border-b-2 cursor-pointer transition-colors bg-transparent flex items-center gap-1.5 ${
                tab === "bans"
                  ? "border-[#E24B4A] text-[#fca5a5] font-bold"
                  : "border-transparent text-silver hover:text-white"
              }`}
            >
              <span>Banned Users</span>
              {bans.length > 0 && (
                <span className="text-[10px] bg-[#E24B4A]/20 text-[#E24B4A] px-1.5 py-0.2 rounded-full">
                  {bans.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Search Bar for Members */}
        {tab === "members" && (
          <div className="p-4 border-b border-[#222232] bg-[#0d0d14] flex-shrink-0">
            <div className="flex items-center gap-2 bg-[#161622] border border-[#2a2a3e] rounded-xl px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="gray" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member by username..."
                className="bg-transparent border-none outline-none text-[12px] text-white placeholder:text-silver/50 w-full font-mono"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-silver hover:text-white bg-transparent border-none cursor-pointer text-[11px]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === "members" && (
            <>
              {filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-silver font-mono">
                  No members found matching "{search}"
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isThisOwner =
                    member.role === "owner" ||
                    member.id === group.ownerId ||
                    member.username === group.owner;
                  const isThisAdmin = member.role === "admin";
                  const isSelf =
                    currentUser &&
                    (member.id === currentUser.id ||
                      member.username === currentUser.username);

                  return (
                    <div
                      key={member.id || member.username}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161622]/60 hover:bg-[#161622] border border-[#222235] rounded-xl p-3 transition-colors"
                    >
                      {/* User identity & badge */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                          style={{ background: avatarColor(member.username) }}
                        >
                          {member.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-white truncate">
                              @{member.username}
                            </span>
                            {isSelf && (
                              <span className="text-[9.5px] font-mono text-silver bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                You
                              </span>
                            )}
                            {isThisOwner && (
                              <span className="text-[9.5px] font-mono bg-[#BA7517]/20 text-[#f59e0b] border border-[#BA7517]/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                ★ Main Admin (Creator)
                              </span>
                            )}
                            {isThisAdmin && !isThisOwner && (
                              <span className="text-[9.5px] font-mono bg-[#7F77DD]/20 text-[#a5b4fc] border border-[#7F77DD]/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                🛡️ Admin
                              </span>
                            )}
                            {!isThisOwner && !isThisAdmin && (
                              <span className="text-[9.5px] font-mono bg-white/5 text-silver border border-white/10 px-1.5 py-0.5 rounded">
                                Member
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Administrative actions */}
                      <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                        {/* Creator naming/unnaming Admin */}
                        {isOwner && !isThisOwner && member.id && (
                          <>
                            {isThisAdmin ? (
                              <button
                                onClick={() => handleRoleChange(member.id, "member")}
                                disabled={actionLoadingId === member.id}
                                className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#7F77DD]/40 text-[#a5b4fc] hover:bg-[#7F77DD]/15 transition-all bg-transparent cursor-pointer disabled:opacity-40"
                                title="Demote admin to regular member"
                              >
                                {actionLoadingId === member.id ? "Updating..." : "Dismiss Admin"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(member.id, "admin")}
                                disabled={actionLoadingId === member.id}
                                className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#7F77DD]/40 text-[#7F77DD] hover:bg-[#7F77DD]/15 transition-all bg-transparent cursor-pointer disabled:opacity-40"
                                title="Promote member to group admin"
                              >
                                {actionLoadingId === member.id ? "Updating..." : "+ Name Admin"}
                              </button>
                            )}
                          </>
                        )}

                        {/* Ban button */}
                        {!isThisOwner && !isSelf && member.id && (
                          <>
                            {(isOwner || (isAdmin && !isThisAdmin)) && (
                              <button
                                onClick={() => onOpenBan(member)}
                                className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#E24B4A]/40 text-[#E24B4A] hover:bg-[#E24B4A]/15 transition-all bg-transparent cursor-pointer"
                                title="Ban user from this group"
                              >
                                Ban
                              </button>
                            )}
                          </>
                        )}

                        {/* Report button */}
                        {!isSelf && member.id && (
                          <button
                            onClick={() => onOpenReport(member)}
                            className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/15 transition-all bg-transparent cursor-pointer"
                            title="Report user to administrators via email"
                          >
                            Report
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === "bans" && (
            <>
              {loadingBans ? (
                <div className="py-8 text-center text-[12px] text-silver font-mono">
                  Loading banned users...
                </div>
              ) : bans.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-silver font-mono">
                  No banned users in this group.
                </div>
              ) : (
                bans.map((ban) => (
                  <div
                    key={ban.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1a1215] border border-[#E24B4A]/30 rounded-xl p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#fca5a5]">
                          @{ban.username}
                        </span>
                        <span className="text-[10px] font-mono text-silver">
                          {ban.email}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-silver mt-1">
                        Reason: <span className="text-white font-mono">{ban.reason || "Misbehavior"}</span>
                      </p>
                      <p className="text-[10px] text-silver/60 font-mono mt-0.5">
                        Banned by @{ban.banned_by_username || "admin"} · {new Date(ban.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => handleUnbanClick(ban.user_id)}
                        disabled={actionLoadingId === ban.user_id}
                        className="text-[11px] font-mono px-3 py-1.5 rounded-lg border border-[#7F77DD]/40 text-[#a5b4fc] hover:bg-[#7F77DD]/20 transition-all bg-transparent cursor-pointer disabled:opacity-40"
                      >
                        {actionLoadingId === ban.user_id ? "Unbanning..." : "Unban User"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0b0b10] border-t border-[#222232] flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
          <span className="text-[11px] text-silver font-mono">
            {group.name} · {group.memberCount} members
          </span>
          <div className="flex items-center gap-2">
            {(isOwner || isAdmin) && (
              <button
                onClick={onInvite}
                className="text-[11.5px] font-mono font-bold text-white bg-[#7F77DD] hover:bg-[#6860ca] px-3 py-1.5 rounded-xl border-none cursor-pointer transition-colors"
              >
                + Invite Members
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[11.5px] font-mono text-silver hover:text-white px-3 py-1.5 rounded-xl border border-gray bg-transparent cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
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
            <span className="app-title-text text-[13px] font-semibold text-[#080808]">
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
                background: "transparent",
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
                background: "transparent",
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
                  background: "transparent",
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
                  <p className="app-title-text text-[13px] font-semibold text-white truncate">
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

// ─── Group card (directory listing) ──────────────────────────────────────────

function GroupCard({ group, onJoin, onOpen, isOwner, onDelete }) {
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
            {isOwner && (
              <span
                className="text-[9.5px] font-mono rounded-md bg-[#BA7517]/20 text-[#F59E0B] border border-[#BA7517]/40 font-semibold"
                style={{
                  paddingLeft: "6px",
                  paddingRight: "6px",
                  paddingTop: "2px",
                  paddingBottom: "2px",
                }}
              >
                ★ Main Admin
              </span>
            )}
            {!isOwner && group.myRole === "admin" && (
              <span
                className="text-[9.5px] font-mono rounded-md bg-[#7F77DD]/20 text-[#A5B4FC] border border-[#7F77DD]/40 font-semibold"
                style={{
                  paddingLeft: "6px",
                  paddingRight: "6px",
                  paddingTop: "2px",
                  paddingBottom: "2px",
                }}
              >
                🛡️ Admin
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-silver leading-relaxed mb-3 line-clamp-2">
            {group.description}
          </p>

          {/* Members row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {(group.members || []).slice(0, 4).map((m, i) => (
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
              {isOwner ? (
                <button
                  onClick={() => onDelete(group.id)}
                  className="text-[11px] font-mono rounded-lg border border-[#E24B4A]/40 text-[#E24B4A] hover:bg-[#E24B4A]/10 transition-all cursor-pointer bg-transparent"
                  style={{
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    paddingTop: "6px",
                    paddingBottom: "6px",
                  }}
                >
                  Delete group
                </button>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post inside group ────────────────────────────────────────────────────────

function GroupPost({
  post,
  groupId,
  onLike,
  onComment,
  isAdmin,
  onDeletePost,
  onDeleteComment,
  onOpenReport,
  currentUser,
}) {
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
      <div className="flex items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
            style={{ background: post.avatarColor || post.color }}
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
            <span className="text-[11px] text-silver font-mono">
              {timeAgo(post.ts)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenReport && post.authorId && post.authorId !== currentUser?.id && (
            <button
              onClick={() => onOpenReport({ id: post.authorId, username: post.author })}
              className="text-silver/50 hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 p-1.5 rounded-lg bg-transparent border-none cursor-pointer transition-all flex items-center justify-center"
              title="Report user / message"
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
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          )}

          {isAdmin && onDeletePost && (
            <button
              onClick={() => onDeletePost(groupId, post.id)}
              className="text-silver/50 hover:text-[#E24B4A] hover:bg-[#E24B4A]/10 p-1.5 rounded-lg bg-transparent border-none cursor-pointer transition-all flex items-center justify-center"
              title="Delete post (Admin only)"
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
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="text-[13px] text-white leading-relaxed mb-3.5 pl-[calc(1.75rem+0.625rem)]">
        {post.body}
      </p>

      {post.attachment_name && (
        <div className="mb-3.5 pl-[calc(1.75rem+0.625rem)]">
          {post.attachment_type && post.attachment_type.startsWith("image/") ? (
            <img 
              src={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/groups/${groupId}/posts/${post.id}/attachment`} 
              alt={post.attachment_name} 
              className="max-w-full md:max-w-[350px] max-h-[300px] rounded-lg border border-gray object-cover"
            />
          ) : (
            <a 
              href={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/groups/${groupId}/posts/${post.id}/attachment`} 
              download={post.attachment_name}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#1a1a2e] border border-[#7F77DD]/30 rounded-lg px-3 py-2 hover:bg-[#7F77DD]/10 transition-colors text-white text-[12px] no-underline max-w-full"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              <span className="truncate max-w-[200px]">{post.attachment_name}</span>
            </a>
          )}
        </div>
      )}

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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <span
                          className="text-[11px] font-semibold text-[#888]"
                          style={{ paddingRight: "8px" }}
                        >
                          {c.author}
                        </span>
                        <span className="text-[10px] text-silver font-mono ml-1.5">
                          {timeAgo(c.ts)}
                        </span>
                      </div>
                      {isAdmin && onDeleteComment && (
                        <button
                          onClick={() => onDeleteComment(groupId, post.id, c.id)}
                          className="text-silver/40 hover:text-[#E24B4A] hover:bg-[#E24B4A]/10 p-1 rounded bg-transparent border-none cursor-pointer transition-all flex items-center justify-center"
                          title="Delete comment (Admin only)"
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
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
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
  onDelete,
  onDeletePost,
  onDeleteComment,
  onOpenManageMembers,
  onOpenReport,
  isOwner,
  isAdmin,
  currentUser,
}) {
  const [postText, setPostText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  function handlePost() {
    if (!postText.trim() && !attachment) return;
    onPublish(postText.trim(), attachment);
    setPostText("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        e.target.value = "";
        return;
      }
      setAttachment(file);
    }
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    className="text-[9.5px] font-mono rounded-md bg-[#BA7517]/20 text-[#F59E0B] border border-[#BA7517]/40 font-semibold flex items-center gap-1"
                    style={{
                      paddingLeft: "8px",
                      paddingRight: "8px",
                      paddingTop: "2px",
                      paddingBottom: "2px",
                    }}
                  >
                    ★ Main Admin
                  </span>
                )}
                {!isOwner && isAdmin && (
                  <span
                    className="text-[9.5px] font-mono rounded-md bg-[#7F77DD]/20 text-[#A5B4FC] border border-[#7F77DD]/40 font-semibold flex items-center gap-1"
                    style={{
                      paddingLeft: "8px",
                      paddingRight: "8px",
                      paddingTop: "2px",
                      paddingBottom: "2px",
                    }}
                  >
                    🛡️ Admin
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-silver leading-relaxed mb-3 max-w-lg">
                {group.description}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="flex -space-x-1.5 cursor-pointer hover:opacity-85 transition-opacity"
                  onClick={onOpenManageMembers}
                  title="View group members"
                >
                  {(group.members || []).slice(0, 5).map((m, i) => {
                    const username = typeof m === "string" ? m : m.username;
                    return (
                      <div
                        key={username + i}
                        className="w-5 h-5 rounded-full border border-[#080808] flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ background: avatarColor(username), zIndex: 5 - i }}
                      >
                        {username.slice(0, 2).toUpperCase()}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={onOpenManageMembers}
                  className="text-[11px] text-silver hover:text-white font-mono bg-transparent border-none cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <span>{group.memberCount.toLocaleString()} members</span>
                  <span className="text-[#818cf8] underline ml-1">
                    {isOwner || isAdmin ? "· Manage" : "· View list"}
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {group.joined && (
              <button
                onClick={onOpenManageMembers}
                className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border border-[#7F77DD]/30 text-[#A5B4FC] hover:bg-[#7F77DD]/10 transition-all cursor-pointer bg-transparent"
                style={{
                  paddingLeft: "12px",
                  paddingRight: "12px",
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
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {isOwner || isAdmin ? "Manage Members" : "Members"}
              </button>
            )}
            {(isOwner || isAdmin) && (
              <button
                onClick={() => onInvite(group.id)}
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
            {isOwner ? (
              <button
                onClick={() => onDelete(group.id)}
                className="text-[11px] font-mono rounded-lg border border-[#E24B4A]/40 text-[#E24B4A] hover:bg-[#E24B4A]/10 transition-all cursor-pointer bg-transparent"
                style={{
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                }}
              >
                Delete group
              </button>
            ) : (
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
            )}
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
              
              {attachment && (
                <div className="flex items-center gap-2 mt-2 bg-[#080808]/50 border border-gray rounded-md px-2 py-1.5 w-max max-w-[80%]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span className="text-[11px] text-silver truncate">{attachment.name}</span>
                  <button 
                    onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="ml-1 text-silver hover:text-white bg-transparent border-none cursor-pointer flex items-center justify-center"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}

              <div className="flex justify-between mt-2 pt-2 border-t border-gray items-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center text-silver hover:text-white bg-transparent border-none cursor-pointer transition-colors"
                  title="Attach file (max 2MB)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  style={{ display: "none" }} 
                />

                <button
                  onClick={handlePost}
                  disabled={!postText.trim() && !attachment}
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
              isAdmin={isAdmin}
              onDeletePost={onDeletePost}
              onDeleteComment={onDeleteComment}
              onOpenReport={onOpenReport}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Community() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // States
  const [view, setView] = useState("directory");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [banTarget, setBanTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [inviteTargetGroupId, setInviteTargetGroupId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
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
            myRole: g.my_role,
            currentUserRole: g.my_role,
            posts: [],
            members: g.members || [],
            memberDetails: g.memberDetails || [],
          };
        });
        setGroups(transformedGroups);
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

  // Auto-open group from URL param (e.g. from notification click)
  useEffect(() => {
    const groupId = searchParams.get("group");
    if (groupId) {
      handleGroupClick(parseInt(groupId));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const isOwner =
    activeGroup?.ownerId === currentUser?.id ||
    activeGroup?.currentUserRole === "owner";
  const isAdmin = isOwner || activeGroup?.currentUserRole === "admin";

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

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      await groupsAPI.delete(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (activeGroupId === id) {
        setView("directory");
        setActiveGroupId(null);
      }
      showToast("Group deleted successfully.");
    } catch (error) {
      console.error("Failed to delete group:", error);
      showToast("Failed to delete group.");
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
              likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1,
            };
          }),
        };
      }),
    );

    try {
      let response;
      if (wasLiked) {
        response = await groupsAPI.unlikePost(groupId, postId);
      } else {
        response = await groupsAPI.likePost(groupId, postId);
      }

      // Sync with server response (source of truth)
      if (response && typeof response.likeCount === 'number') {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              posts: g.posts.map((p) => {
                if (p.id !== postId) return p;
                return {
                  ...p,
                  liked: response.liked,
                  likes: response.likeCount,
                };
              }),
            };
          }),
        );
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
                likes: wasLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
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
        attachment_name: p.attachment_name,
        attachment_type: p.attachment_type,
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

  async function handlePublish(content, attachment) {
    try {
      await groupsAPI.createPost(activeGroupId, content, attachment);
      handleGroupClick(activeGroupId);
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
    invites,
  }) {
    try {
      const createResponse = await groupsAPI.create(name, description, category);
      const newGroupId = createResponse.group?.id;

      // Send invites now that we have the group ID
      let successfulInvites = 0;
      if (newGroupId && invites && invites.length > 0) {
        const inviteResults = await Promise.allSettled(
          invites.map((email) => groupsAPI.invite(newGroupId, email))
        );
        successfulInvites = inviteResults.filter((r) => r.status === "fulfilled").length;
      }

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
          members: g.members || [],
        };
      });
      setGroups(transformedGroups);
      setShowCreate(false);
      showToast(
        `"${name}" created${successfulInvites > 0 ? ` · ${successfulInvites} invite${successfulInvites > 1 ? "s" : ""} sent` : ""}.`,
      );
    } catch (error) {
      console.error("Failed to create group:", error);
      showToast("Failed to create group.");
    }
  }

  async function handleInvite(groupId) {
    setInviteTargetGroupId(groupId);
    setShowInviteModal(true);
  }

  async function processInvites(invites) {
    if (!invites || invites.length === 0) return;
    setShowInviteModal(false);
    try {
      const inviteResults = await Promise.allSettled(
        invites.map((email) => groupsAPI.invite(inviteTargetGroupId, email)),
      );
      const failedInvites = inviteResults.filter(
        (r) => r.status === "rejected",
      );
      if (failedInvites.length > 0) {
        showToast(`${failedInvites.length} invite(s) failed.`);
      } else {
        showToast(`${invites.length} invite(s) sent successfully.`);
      }
    } catch (error) {
      console.error("Failed to send invites:", error);
      showToast("Failed to send invites.");
    }
  }

  async function handleGroupClick(groupId) {
    try {
      setActiveGroupId(groupId);
      const groupResponse = await groupsAPI.getById(groupId);
      const transformedPosts = groupResponse.posts.map((p) => ({
        id: p.id,
        author: p.username,
        authorId: p.user_id || p.post_author_id,
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
        attachment_name: p.attachment_name,
        attachment_type: p.attachment_type,
      }));
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            posts: transformedPosts,
            members: groupResponse.group.members || [],
            memberDetails: groupResponse.group.memberDetails || [],
            currentUserRole: groupResponse.group.currentUserRole || g.currentUserRole,
            ownerId: groupResponse.group.owner_id || g.ownerId,
            owner: groupResponse.group.owner_username || g.owner,
          };
        }),
      );
      setView("group");
    } catch (error) {
      console.error("Failed to fetch group:", error);
      if (error.status === 403 || error.message?.toLowerCase().includes("banned")) {
        showToast("You are banned from this group.");
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setActiveGroupId(null);
        setView("directory");
        return;
      }
      showToast("Failed to load group.");
    }
  }

  async function handleDeletePost(groupId, postId) {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await groupsAPI.deletePost(groupId, postId);
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            posts: g.posts.filter((p) => p.id !== postId),
          };
        }),
      );
      showToast("Message deleted.");
    } catch (error) {
      console.error("Failed to delete post:", error);
      showToast(error.message || "Failed to delete post.");
    }
  }

  async function handleDeleteComment(groupId, postId, commentId) {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await groupsAPI.deleteComment(groupId, postId, commentId);
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            posts: g.posts.map((p) => {
              if (p.id !== postId) return p;
              return {
                ...p,
                comments: p.comments.filter((c) => c.id !== commentId),
              };
            }),
          };
        }),
      );
      showToast("Comment deleted.");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      showToast(error.message || "Failed to delete comment.");
    }
  }

  async function handleUpdateRole(groupId, userId, newRole) {
    try {
      await groupsAPI.updateMemberRole(groupId, userId, newRole);
      const groupResponse = await groupsAPI.getById(groupId);
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            members: groupResponse.group.members || [],
            memberDetails: groupResponse.group.memberDetails || [],
            currentUserRole: groupResponse.group.currentUserRole || g.currentUserRole,
          };
        }),
      );
      showToast(
        newRole === "admin"
          ? "Member named as Admin."
          : "Admin privileges removed.",
      );
    } catch (error) {
      console.error("Failed to update role:", error);
      showToast(error.message || "Failed to update role.");
    }
  }

  async function handleBanMember(groupId, userId, reason) {
    try {
      await groupsAPI.banMember(groupId, userId, reason);
      const groupResponse = await groupsAPI.getById(groupId);
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            memberCount: Math.max(0, g.memberCount - 1),
            members: groupResponse.group.members || [],
            memberDetails: groupResponse.group.memberDetails || [],
          };
        }),
      );
      showToast("User banned from this group.");
      setBanTarget(null);
    } catch (error) {
      console.error("Failed to ban member:", error);
      showToast(error.message || "Failed to ban member.");
    }
  }

  async function handleUnbanMember(groupId, userId) {
    try {
      await groupsAPI.unbanMember(groupId, userId);
      showToast("User unbanned successfully.");
    } catch (error) {
      console.error("Failed to unban member:", error);
      showToast(error.message || "Failed to unban member.");
    }
  }

  async function handleReportMember(groupId, userId, reason, details) {
    try {
      await groupsAPI.reportMember(groupId, userId, reason, details);
      showToast("Report submitted successfully. Incident report dispatched.");
      setReportTarget(null);
    } catch (error) {
      console.error("Failed to report member:", error);
      showToast(error.message || "Failed to report member.");
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
                      isOwner={g.ownerId === currentUser?.id}
                      onDelete={handleDelete}
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
              onDelete={handleDelete}
              onDeletePost={handleDeletePost}
              onDeleteComment={handleDeleteComment}
              onOpenManageMembers={() => setShowMembersModal(true)}
              onOpenReport={(member) => setReportTarget(member)}
              isOwner={isOwner}
              isAdmin={isAdmin}
              currentUser={currentUser}
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

      {showInviteModal && (
        <InviteMemberModal
          groupName={groups.find((g) => g.id === inviteTargetGroupId)?.name || "Group"}
          onClose={() => setShowInviteModal(false)}
          onInvite={processInvites}
        />
      )}

      {showMembersModal && activeGroup && (
        <ManageMembersModal
          group={activeGroup}
          currentUser={currentUser}
          isOwner={isOwner}
          isAdmin={isAdmin}
          onClose={() => setShowMembersModal(false)}
          onUpdateRole={(userId, newRole) =>
            handleUpdateRole(activeGroup.id, userId, newRole)
          }
          onOpenBan={(member) => {
            setBanTarget(member);
            setShowMembersModal(false);
          }}
          onOpenReport={(member) => {
            setReportTarget(member);
            setShowMembersModal(false);
          }}
          onUnban={(userId) => handleUnbanMember(activeGroup.id, userId)}
          onInvite={() => {
            setShowMembersModal(false);
            handleInvite(activeGroup.id);
          }}
        />
      )}

      {banTarget && activeGroup && (
        <BanMemberModal
          targetUser={banTarget}
          groupName={activeGroup.name}
          onClose={() => setBanTarget(null)}
          onConfirm={(reason) =>
            handleBanMember(activeGroup.id, banTarget.id, reason)
          }
        />
      )}

      {reportTarget && activeGroup && (
        <ReportMemberModal
          targetUser={reportTarget}
          groupName={activeGroup.name}
          onClose={() => setReportTarget(null)}
          onSubmit={(reason, details) =>
            handleReportMember(activeGroup.id, reportTarget.id, reason, details)
          }
        />
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
