import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import { savedItemsAPI, groupsAPI, postsAPI } from "../utils/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

const TYPE_META = {
  post: { label: "Post", color: "#7F77DD", bg: "#1a1a2e" },
  resource: { label: "Resource", color: "#BA7517", bg: "#2e2a1a" },
  event: { label: "Event", color: "#1D9E75", bg: "#1a2a2e" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "post", label: "Posts" },
  { key: "resource", label: "Resources" },
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

function pad(n) {
  return String(n).padStart(2, "0");
}
function toISO(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function todayISO() {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}
function formatShort(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}

function extractDomain(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const TODAY = todayISO();

// ─── API Integration ─────────────────────────────────────────────────────────

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] border border-[#2a2a2a] rounded-lg text-[12px] font-mono text-[#ccc] pointer-events-none whitespace-nowrap z-[200] transition-all duration-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      style={{ padding: "10px 20px" }}
    >
      {message}
    </div>
  );
}

// ─── Save-a-link modal ─────────────────────────────────────────────────────────

function SaveResourceModal({ onClose, onSave }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const urlRef = useRef(null);

  useEffect(() => {
    urlRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a URL to save.");
      return;
    }
    if (!/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(trimmed)) {
      setError("That doesn't look like a valid URL.");
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const domain = extractDomain(normalizedUrl);
    onSave({
      url: normalizedUrl,
      domain,
      title: title.trim() || domain,
      note: note.trim(),
    });
  }

  const domainPreview = url.trim() ? extractDomain(url.trim()) : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ padding: "16px" }}
    >
      <div className="w-full max-w-[480px] bg-white/10 md:bg-white/1 backdrop-blur-md rounded-2xl overflow-hidden">
        {/* Modal header */}
        <div
          className="flex items-center justify-between border-b border-white"
          style={{ padding: "16px 24px" }}
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
                stroke="#BA7517"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-[#080808]">
              Save a link
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

        {/* Modal body */}
        <div className="space-y-5" style={{ padding: "24px" }}>
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              URL
            </label>
            <input
              ref={urlRef}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="hacktricks.xyz/some-page"
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{ padding: "12px 16px" }}
            />
            {domainPreview && (
              <p className="text-[10.5px] font-mono text-silver mt-1.5">
                Will save from{" "}
                <span className="text-white">{domainPreview}</span>
              </p>
            )}
          </div>
          <br />

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Title{" "}
              <span className="text-silver normal-case tracking-normal font-normal">
                — optional
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to the domain name"
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{ padding: "12px 16px" }}
            />
          </div>
          <br />

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Note{" "}
              <span className="text-silver normal-case tracking-normal font-normal">
                — optional
              </span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why you're saving this"
              rows={2}
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors resize-none placeholder:text-silver"
              style={{ padding: "12px 16px" }}
            />
          </div>

          {error && <p className="text-[11px] text-white font-mono">{error}</p>}
        </div>

        {/* Modal footer */}
        <div
          className="flex justify-end gap-2.5 border-t border-white bg-white/10"
          style={{ padding: "16px 24px" }}
        >
          <button
            onClick={onClose}
            className="bg-transparent border border-white rounded-lg text-[12px] text-white hover:text-silver transition-colors cursor-pointer"
            style={{ padding: "8px 16px" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-[#080808] text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
            style={{ padding: "8px 16px" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Saved item card ────────────────────────────────────────────────────────────

function TypeIcon({ type, color }) {
  if (type === "post") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (type === "event") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ─── Reshare post modal ───────────────────────────────────────────────────────

function ReshareModal({ post, onClose, onReshareSuccess }) {
  const [destination, setDestination] = useState("feed"); // "feed" | "group"
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [commentary, setCommentary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchGroups() {
      setLoadingGroups(true);
      try {
        const res = await groupsAPI.getAll();
        const list = res.groups || [];
        setGroups(list);
        if (list.length > 0) {
          const joinedGroup = list.find((g) => g.joined);
          setSelectedGroupId(joinedGroup ? joinedGroup.id : list[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      } finally {
        setLoadingGroups(false);
      }
    }
    fetchGroups();
  }, []);

  async function handleReshare() {
    setError("");
    setSubmitting(true);
    try {
      const authorHandle = post.author ? `@${post.author}` : "User";
      const quoteBlock = `🔁 Reshared from ${authorHandle}:\n"${post.snippet || post.title}"`;
      const finalContent = commentary.trim()
        ? `${commentary.trim()}\n\n${quoteBlock}`
        : quoteBlock;

      if (destination === "feed") {
        await postsAPI.create(finalContent);
        onReshareSuccess("Reshared to Global Feed!");
      } else {
        if (!selectedGroupId) {
          setError("Please select a group to reshare to.");
          setSubmitting(false);
          return;
        }
        const targetGroup = groups.find((g) => String(g.id) === String(selectedGroupId));
        if (targetGroup && !targetGroup.joined) {
          try {
            await groupsAPI.join(selectedGroupId);
          } catch (joinErr) {
            console.warn("Could not auto-join group:", joinErr);
          }
        }
        await groupsAPI.createPost(selectedGroupId, finalContent);
        onReshareSuccess(`Reshared to ${targetGroup?.name || "group"}!`);
      }
      onClose();
    } catch (err) {
      console.error("Reshare error:", err);
      setError(err?.message || "Failed to reshare post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ padding: "16px" }}
    >
      <div className="w-full max-w-[500px] bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c1c1c] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7F77DD]/15 border border-[#7F77DD]/35 flex items-center justify-center text-[#7F77DD]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">Reshare Post</h3>
              <p className="text-[11px] font-mono text-[#666]">Share to Global Feed or a Group</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#666] hover:text-white bg-transparent border-none cursor-pointer transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Destination Selector */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">
              Destination
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#141414] p-1 rounded-xl border border-[#222]">
              <button
                type="button"
                onClick={() => setDestination("feed")}
                className={`py-2 px-3 rounded-lg text-[12px] font-mono transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
                  destination === "feed"
                    ? "bg-[#222] text-white font-semibold shadow-sm"
                    : "bg-transparent text-[#666] hover:text-[#ccc]"
                }`}
              >
                <span>🌐</span> Global Feed
              </button>
              <button
                type="button"
                onClick={() => setDestination("group")}
                className={`py-2 px-3 rounded-lg text-[12px] font-mono transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
                  destination === "group"
                    ? "bg-[#222] text-white font-semibold shadow-sm"
                    : "bg-transparent text-[#666] hover:text-[#ccc]"
                }`}
              >
                <span>👥</span> Group
              </button>
            </div>
          </div>

          {/* Group Picker */}
          {destination === "group" && (
            <div>
              <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">
                Select Group
              </label>
              {loadingGroups ? (
                <div className="text-[11px] font-mono text-[#555] py-2">Loading groups…</div>
              ) : groups.length === 0 ? (
                <div className="text-[12px] font-mono text-[#E24B4A] py-1">No groups available. Please join or create a group first.</div>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-[#141414] border border-[#252525] rounded-xl text-[12.5px] text-white outline-none focus:border-[#7F77DD] transition-colors px-3.5 py-2.5 cursor-pointer"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[#141414] text-white">
                      {g.name} {g.joined ? "✓ (Member)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Thoughts Textarea */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">
              Add your thoughts (optional)
            </label>
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="What do you think about this post?"
              rows={3}
              className="w-full bg-[#141414] border border-[#252525] rounded-xl text-[13px] text-white outline-none focus:border-[#7F77DD] transition-colors p-3.5 placeholder:text-[#444] resize-none"
            />
          </div>

          {/* Quoted Post Card Preview */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#666] mb-1.5">
              Quoting
            </label>
            <div className="border border-[#222] bg-[#111] rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ background: post.authorColor || "#534AB7" }}
                >
                  {(post.author || "U").slice(0, 1).toUpperCase()}
                </div>
                <span className="text-[12px] font-semibold text-[#ddd]">@{post.author || "author"}</span>
                <span className="text-[10px] font-mono text-[#555] ml-auto">Original Post</span>
              </div>
              <p className="text-[12.5px] text-[#999] leading-relaxed line-clamp-3 italic">
                "{post.snippet || post.title}"
              </p>
            </div>
          </div>

          {error && (
            <p className="text-[11px] font-mono text-[#E24B4A] bg-[#2e1a1a] p-2.5 rounded-lg border border-[#E24B4A]/30">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#1c1c1c] px-6 py-4 bg-[#090909]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12px] font-mono text-[#777] hover:text-white bg-transparent border border-[#222] hover:border-[#333] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReshare}
            disabled={submitting || (destination === "group" && !selectedGroupId)}
            className="px-5 py-2 rounded-lg text-[12px] font-semibold bg-[#7F77DD] text-white hover:bg-[#6c64cf] transition-colors cursor-pointer border-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Resharing…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                Reshare
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Saved item card ────────────────────────────────────────────────────────────

function SavedItemCard({ item, onRemove, onOpen, onScan, onReshare }) {
  const meta = TYPE_META[item.type] || { label: "Item", color: "#888", bg: "#1a1a1a" };

  return (
    <div
      className="relative bg-[#080808] border border-[#1c1c1c] rounded-2xl hover:border-[#242424] transition-colors"
      style={{ padding: "20px" }}
    >
      {/* Unsave toggle */}
      <button
        onClick={() => onRemove(item.id)}
        title="Remove from saved items"
        className="absolute top-4 right-4 text-[#7F77DD] hover:text-[#E24B4A] transition-colors bg-transparent border-none cursor-pointer"
        style={{ padding: "4px" }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div className="flex items-start gap-4 pr-7">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border"
          style={{ background: meta.bg, borderColor: meta.color + "22" }}
        >
          <TypeIcon type={item.type} color={meta.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="app-title-text text-[14px] font-semibold text-white truncate min-w-0">
              {item.title}
            </span>
            <span
              className="text-[10px] font-mono rounded-md flex-shrink-0"
              style={{
                background: meta.bg,
                color: meta.color,
                padding: "2px 8px",
              }}
            >
              {meta.label}
            </span>
          </div>

          {/* Context line */}
          <div className="flex items-center gap-2 text-[11px] text-[#555] font-mono mb-2.5 flex-wrap">
            {item.type === "post" && (
              <>
                <span className="truncate">{item.context || "Global feed"}</span>
                <span className="text-[#222] flex-shrink-0">·</span>
                <span className="truncate">by {item.author || "User"}</span>
              </>
            )}
            {item.type === "event" && (
              <>
                <span className="truncate">{item.context}</span>
                <span className="text-[#222] flex-shrink-0">·</span>
                <span className="flex-shrink-0">
                  {formatShort(item.date)} · {formatTime(item.time)}
                </span>
              </>
            )}
            {item.type === "resource" && (
              <span className="flex items-center gap-1.5 text-[#666] truncate">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {item.domain || item.url}
              </span>
            )}
          </div>

          <p className="text-[12.5px] text-[#555] leading-relaxed mb-3.5 line-clamp-2">
            {item.snippet}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[10.5px] text-[#383838] font-mono flex-shrink-0">
                Saved {timeAgo(item.savedAt)}
              </span>
              {item.type === "post" && (
                <span className="flex items-center gap-2.5 text-[10.5px] text-[#383838] font-mono flex-shrink-0">
                  <span className="flex items-center gap-1">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {item.meta?.likes ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {item.meta?.comments ?? 0}
                  </span>
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Scan button for items that are links or have a URL */}
              {item.url && (
                <button
                  onClick={() => onScan(item.url)}
                  className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex-shrink-0 bg-[#1D9E75]/10 border-[#1D9E75]/40 text-[#1D9E75] hover:bg-[#1D9E75]/25"
                  style={{ padding: "6px 12px" }}
                  title="Scan this URL with Vulnerability Scanner"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Scan
                </button>
              )}

              {/* Resource action: Visit or Download */}
              {item.type === "resource" && (
                <a
                  href={item.fileId ? `${API_BASE}/resources/files/${item.fileId}/download` : item.url}
                  target={item.fileId ? undefined : "_blank"}
                  rel={item.fileId ? undefined : "noopener noreferrer"}
                  download={item.fileId ? item.fileName : undefined}
                  className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex-shrink-0 bg-[#BA7517]/10 border-[#BA7517]/40 text-[#BA7517] hover:bg-[#BA7517]/25 no-underline"
                  style={{ padding: "6px 12px" }}
                >
                  {item.fileId ? "Download" : "Visit"}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}

              {/* Post action: Reshare in groups / global feed */}
              {item.type === "post" && (
                <button
                  onClick={() => onReshare(item)}
                  className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex-shrink-0 bg-[#7F77DD]/10 border-[#7F77DD]/40 text-[#7F77DD] hover:bg-[#7F77DD]/25"
                  style={{ padding: "6px 12px" }}
                  title="Reshare this post to Global Feed or Group"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 1l4 4-4 4" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 23l-4-4 4-4" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  Reshare
                </button>
              )}

              {/* Open button for non-resources */}
              {item.type !== "resource" && (
                <button
                  onClick={() => onOpen(item)}
                  className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex-shrink-0"
                  style={{
                    background: meta.color + "1a",
                    borderColor: meta.color + "55",
                    color: meta.color,
                    padding: "6px 12px",
                  }}
                >
                  Open
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SavedItems() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showSave, setShowSave] = useState(false);
  const [reshareTarget, setReshareTarget] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        const data = await savedItemsAPI.getAll();
        setItems(data.items || []);
      } catch (err) {
        console.error("Failed to fetch saved items:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      2800,
    );
  }

  async function handleRemove(id) {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    try {
      await savedItemsAPI.unsave(target.type, target.real_id, target.id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast(`Removed "${target.title || "item"}" from saved items`);
    } catch (e) {
      console.error("Failed to remove item:", e);
      // Fallback: remove from UI state
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast("Removed from saved items");
    }
  }

  function handleScan(url) {
    if (!url) return;
    navigate(`/main/scanner?url=${encodeURIComponent(url)}`, { state: { url } });
  }

  function handleOpen(item) {
    if (item.type === "event") {
      navigate("/main/events");
    } else if (item.type === "post") {
      navigate("/main");
    } else if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleSave({ url, domain, title, note }) {
    try {
      const res = await savedItemsAPI.saveLink({ url, title, note });
      if (res?.item) {
        setItems((prev) => [res.item, ...prev]);
      } else {
        const data = await savedItemsAPI.getAll();
        setItems(data.items || []);
      }
      setShowSave(false);
      showToast(`Saved "${title || domain}"`);
    } catch (err) {
      console.error("Failed to save link:", err);
      showToast("Failed to save link");
    }
  }

  const counts = {
    all: items.length,
    post: items.filter((i) => i.type === "post").length,
    event: items.filter((i) => i.type === "event").length,
    resource: items.filter((i) => i.type === "resource").length,
  };

  const filteredItems = items
    .filter((i) => filter === "all" || i.type === filter)
    .filter((i) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.snippet.toLowerCase().includes(q) ||
        (i.context && i.context.toLowerCase().includes(q)) ||
        (i.author && i.author.toLowerCase().includes(q)) ||
        (i.domain && i.domain.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => b.savedAt - a.savedAt);

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
          className="w-[375px] sm:w-[768px] lg:w-[1100px] mx-auto"
          style={{ padding: "48px 32px 80px" }}
        >
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-[18px] font-semibold text-white tracking-tight">
                Saved Items
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[11px] text-gray-400 md:text-[#444] font-mono">
                  {items.length} saved
                </p>
                <span className="text-gray-400 md:text-[#444]">·</span>
                <p className="text-[11px] text-gray-400 md:text-[#444] font-mono">
                  for you
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-2 text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none flex-shrink-0"
              style={{ padding: "8px 16px" }}
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
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Save a link
            </button>
          </div>

          {/* Search + filter */}
          <div
            className="flex flex-col sm:flex-row gap-2.5 mb-6"
            style={{ padding: "10px 12px" }}
          >
            <div className="relative flex-1">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white pointer-events-none"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved items…"
                className="w-full bg-transparent rounded-xl text-[12.5px] font-mono text-white outline-none transition-colors placeholder:text-white"
                style={{ padding: "10px 16px 10px 36px" }}
              />
            </div>
            {/* Type filter pills */}
            <div className="flex w-fit rounded-xl overflow-hidden">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1.5 text-[11.5px] font-mono transition-colors cursor-pointer border-none ${active
                      ? "bg-white text-black"
                      : "bg-transparent text-white hover:text-[#777]"
                      }`}
                    style={{ padding: "10px 16px" }}
                  >
                    {f.label}
                    <span className="opacity-60">{counts[f.key]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <br />

          <div className="flex items-center gap-3 mb-4">
            <p className="text-[9.5px] font-mono font-bold text-white tracking-[0.18em] uppercase whitespace-nowrap">
              {query || filter !== "all"
                ? `${filteredItems.length} result${filteredItems.length !== 1 ? "s" : ""}`
                : "All saved items"}
            </p>
            <div className="flex-1 h-px bg-white" />
          </div>
          <br />

          {/* List */}
          {loading ? (
            <div
              className="flex flex-col items-center justify-center gap-3"
              style={{ padding: "64px 0" }}
            >
              <p className="text-[12px] font-mono text-[#666] text-center">
                Loading saved items…
              </p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredItems.map((item) => (
                <SavedItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onOpen={handleOpen}
                  onScan={handleScan}
                  onReshare={setReshareTarget}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
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
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-[12px] font-mono text-[#2a2a2a] text-center max-w-[260px]">
                Nothing saved yet. Bookmark posts and events as you browse, or
                save a link directly.
              </p>
              <button
                onClick={() => setShowSave(true)}
                className="text-[11px] font-mono text-[#444] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
              >
                Save a link
              </button>
            </div>
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
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-[12px] font-mono text-[#2a2a2a]">
                No saved items match.
              </p>
              {filter !== "all" && (
                <button
                  onClick={() => setFilter("all")}
                  className="text-[11px] font-mono text-[#444] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showSave && (
        <SaveResourceModal
          onClose={() => setShowSave(false)}
          onSave={handleSave}
        />
      )}

      {reshareTarget && (
        <ReshareModal
          post={reshareTarget}
          onClose={() => setReshareTarget(null)}
          onReshareSuccess={(msg) => showToast(msg)}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
