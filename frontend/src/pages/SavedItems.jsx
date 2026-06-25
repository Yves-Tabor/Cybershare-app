import { useState, useRef, useEffect } from "react";
import mainBg from "../assets/mainBg.png";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#534AB7","#0F6E56","#993C1D","#185FA5","#854F0B","#993556","#2a6b6b","#6b2a55",
];

const TYPE_META = {
  post:     { label: "Post",     color: "#7F77DD", bg: "#1a1a2e" },
  event:    { label: "Event",    color: "#1D9E75", bg: "#1a2a2e" },
  resource: { label: "Resource", color: "#BA7517", bg: "#2e2a1a" },
};

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "post",     label: "Posts" },
  { key: "event",    label: "Events" },
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

function pad(n) { return String(n).padStart(2, "0"); }
function toISO(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayISO() { const d = new Date(); return toISO(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}
function formatShort(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}

function avatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

// ─── Seed data ────────────────────────────────────────────────────────────────

const INITIAL_ITEMS = [
  {
    id: 1, type: "post",
    title: "New lateral movement technique using DCOM",
    snippet: "Avoids Sysmon event 3 entirely — full write-up posted in the thread, tested on Win11 22H2.",
    context: "Red Team Operators", author: "cypher_x",
    meta: { likes: 41, comments: 2 },
    savedAt: Date.now() - 1000 * 60 * 60 * 4,
  },
  {
    id: 2, type: "post",
    title: "23 living-off-the-land binaries most EDRs still miss",
    snippet: "A compiled list of LOLBins that fly under common EDR detection logic going into 2026.",
    context: "Red Team Operators", author: "vxresearch",
    meta: { likes: 88, comments: 0 },
    savedAt: Date.now() - 1000 * 60 * 60 * 21,
  },
  {
    id: 3, type: "post",
    title: "Sigma rule: detects PrintNightmare-style abuse",
    snippet: "Tested against 14 adversary simulations. A non-system-printer condition cuts false positives by ~40%.",
    context: "Blue Team Collective", author: "patchwatcher",
    meta: { likes: 67, comments: 1 },
    savedAt: Date.now() - 1000 * 60 * 60 * 29,
  },
  {
    id: 4, type: "post",
    title: "P1 SSRF chained with an open redirect — $18k payout",
    snippet: "Full methodology from the fintech engagement, including the recon steps that surfaced the redirect.",
    context: "Bug Bounty Hunters", author: "root_kai",
    meta: { likes: 112, comments: 1 },
    savedAt: Date.now() - 1000 * 60 * 60 * 47,
  },
  {
    id: 5, type: "event",
    title: "Sigma Rule Writing Workshop",
    snippet: "Hands-on session building detection rules from real adversary simulation logs.",
    context: "Hosted by patchwatcher", date: addDays(TODAY, 2), time: "18:00",
    savedAt: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: 6, type: "event",
    title: "Quarterly CTF Finals",
    snippet: "Top 10 teams from the qualifier round face off live across pwn, crypto, and web.",
    context: "Hosted by defcon_jay", date: addDays(TODAY, 5), time: "10:00",
    savedAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: 7, type: "resource",
    title: "GTFOBins",
    snippet: "Curated list of Unix binaries that can be abused to bypass local security restrictions.",
    domain: "gtfobins.github.io", url: "https://gtfobins.github.io",
    savedAt: Date.now() - 1000 * 60 * 60 * 70,
  },
  {
    id: 8, type: "resource",
    title: "MITRE ATT&CK Navigator",
    snippet: "Layered matrix view for mapping detection coverage and gaps to ATT&CK techniques.",
    domain: "mitre-attack.github.io", url: "https://mitre-attack.github.io/attack-navigator/",
    savedAt: Date.now() - 1000 * 60 * 60 * 94,
  },
  {
    id: 9, type: "resource",
    title: "HackTricks",
    snippet: "Pentesting methodology wiki — escalation paths, cloud abuse techniques, and CTF tricks.",
    domain: "book.hacktricks.xyz", url: "https://book.hacktricks.xyz",
    savedAt: Date.now() - 1000 * 60 * 60 * 118,
  },
];

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
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) { setError("Paste a URL to save."); return; }
    if (!/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(trimmed)) { setError("That doesn't look like a valid URL."); return; }
    const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const domain = extractDomain(normalizedUrl);
    onSave({ url: normalizedUrl, domain, title: title.trim() || domain, note: note.trim() });
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
          <div className="flex items-center bg-white gap-2.5 rounded-md" style={{ padding: "10px" }}>
            <div className="w-6 h-6 rounded-md bg-gray border border-gray flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-[#080808]">Save a link</span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            style={{ padding: "4px" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div className="space-y-5" style={{ padding: "24px" }}>
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">URL</label>
            <input
              ref={urlRef}
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="hacktricks.xyz/some-page"
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{ padding: "12px 16px" }}
            />
            {domainPreview && (
              <p className="text-[10.5px] font-mono text-silver mt-1.5">Will save from <span className="text-white">{domainPreview}</span></p>
            )}
          </div><br />

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Title <span className="text-silver normal-case tracking-normal font-normal">— optional</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to the domain name"
              className="w-full border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{ padding: "12px 16px" }}
            />
          </div><br />

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Note <span className="text-silver normal-case tracking-normal font-normal">— optional</span>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    );
  }
  if (type === "event") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function SavedItemCard({ item, onRemove, onOpen }) {
  const meta = TYPE_META[item.type];

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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
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
            <span className="text-[14px] font-semibold text-white truncate min-w-0">{item.title}</span>
            <span
              className="text-[10px] font-mono rounded-md flex-shrink-0"
              style={{ background: meta.bg, color: meta.color, padding: "2px 8px" }}
            >
              {meta.label}
            </span>
          </div>

          {/* Context line */}
          <div className="flex items-center gap-2 text-[11px] text-[#555] font-mono mb-2.5 flex-wrap">
            {item.type === "post" && (
              <>
                <span className="truncate">{item.context}</span><span className="text-[#222] flex-shrink-0">·</span><span className="truncate">by {item.author}</span>
              </>
            )}
            {item.type === "event" && (
              <>
                <span className="truncate">{item.context}</span><span className="text-[#222] flex-shrink-0">·</span>
                <span className="flex-shrink-0">{formatShort(item.date)} · {formatTime(item.time)}</span>
              </>
            )}
            {item.type === "resource" && (
              <span className="flex items-center gap-1.5 text-[#666] truncate">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                {item.domain}
              </span>
            )}
          </div>

          <p className="text-[12.5px] text-[#555] leading-relaxed mb-3.5 line-clamp-2">{item.snippet}</p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[10.5px] text-[#383838] font-mono flex-shrink-0">Saved {timeAgo(item.savedAt)}</span>
              {item.type === "post" && (
                <span className="flex items-center gap-2.5 text-[10.5px] text-[#383838] font-mono flex-shrink-0">
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    {item.meta.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {item.meta.comments}
                  </span>
                </span>
              )}
            </div>

            {item.type === "resource" ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex-shrink-0 bg-[#BA7517]/10 border-[#BA7517]/40 text-[#BA7517] hover:bg-[#BA7517]/20 no-underline"
                style={{ padding: "6px 12px" }}
              >
                Visit
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            ) : (
              <button
                onClick={() => onOpen(item)}
                className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex-shrink-0"
                style={{ background: meta.color + "1a", borderColor: meta.color + "55", color: meta.color, padding: "6px 12px" }}
              >
                Open
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SavedItems() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showSave, setShowSave] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef(null);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }

  function handleRemove(id) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) showToast(`Removed "${target.title}" from saved items`);
      return prev.filter((i) => i.id !== id);
    });
  }

  function handleOpen(item) {
    showToast(item.type === "event" ? `Opening ${item.title} on Events…` : `Opening ${item.context} on Community…`);
  }

  function handleSave({ url, domain, title, note }) {
    const newItem = {
      id: Date.now(), type: "resource",
      title, domain, url,
      snippet: note || `Saved from ${domain}.`,
      savedAt: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
    setShowSave(false);
    showToast(`Saved "${title}"`);
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
              <h1 className="text-[18px] font-semibold text-white tracking-tight">Saved Items</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[11px] text-gray-400 md:text-[#444] font-mono">{items.length} saved</p>
                <span className="text-gray-400 md:text-[#444]">·</span>
                <p className="text-[11px] text-gray-400 md:text-[#444] font-mono">for you</p>
              </div>
            </div>
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-2 text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none flex-shrink-0"
              style={{ padding: "8px 16px" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Save a link
            </button>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-2.5 mb-6" style={{ padding: "10px 12px" }}>
            <div className="relative flex-1">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white pointer-events-none"
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
                    className={`flex items-center gap-1.5 text-[11.5px] font-mono transition-colors cursor-pointer border-none ${
                      active ? "bg-white text-black" : "bg-transparent text-white hover:text-[#777]"
                    }`}
                    style={{ padding: "10px 16px" }}
                  >
                    {f.label}
                    <span className="opacity-60">{counts[f.key]}</span>
                  </button>
                );
              })}
            </div>
          </div><br />

          <div className="flex items-center gap-3 mb-4">
            <p className="text-[9.5px] font-mono font-bold text-white tracking-[0.18em] uppercase whitespace-nowrap">
              {query || filter !== "all" ? `${filteredItems.length} result${filteredItems.length !== 1 ? "s" : ""}` : "All saved items"}
            </p>
            <div className="flex-1 h-px bg-white" />
          </div><br />

          {/* List */}
          {filteredItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredItems.map((item) => (
                <SavedItemCard key={item.id} item={item} onRemove={handleRemove} onOpen={handleOpen} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3" style={{ padding: "64px 0" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-[12px] font-mono text-[#2a2a2a] text-center max-w-[260px]">
                Nothing saved yet. Bookmark posts and events as you browse, or save a link directly.
              </p>
              <button
                onClick={() => setShowSave(true)}
                className="text-[11px] font-mono text-[#444] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
              >
                Save a link
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3" style={{ padding: "64px 0" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p className="text-[12px] font-mono text-[#2a2a2a]">No saved items match.</p>
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

      {showSave && <SaveResourceModal onClose={() => setShowSave(false)} onSave={handleSave} />}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}