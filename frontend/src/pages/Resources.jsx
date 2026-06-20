import { useState, useRef, useCallback } from "react";
import mainBg from "../assets/mainBg.png";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAMPLE_RESOURCES = [
  {
    id: 1,
    author: "WALVESTH72",
    handle: "@walvesth72",
    date: "4/14/2026",
    initials: "WA",
    title: "git",
    content: "git bash exe",
    tags: ["#Resource", "#Knowledge"],
    files: [{ name: "Git-2.49.0-64-bit.exe", size: "67.03 MB", type: "application/x-msdownload" }],
  },
  {
    id: 2,
    author: "WALVESTH72",
    handle: "@walvesth72",
    date: "4/14/2026",
    initials: "WA",
    title: "Proteus",
    content: "proteus execution file",
    tags: ["#Resource", "#Knowledge"],
    files: [{ name: "proteus9.0.SP2.exe", size: "773.93 MB", type: "application/x-msdownload" }],
  },
  {
    id: 3,
    author: "nullbyte",
    handle: "@nullbyte",
    date: "4/13/2026",
    initials: "NU",
    title: "Burp Suite Community",
    content: "Latest community edition installer for web app testing",
    tags: ["#Tool", "#Resource"],
    files: [{ name: "burpsuite_community_v2025.jar", size: "112.4 MB", type: "application/java-archive" }],
  },
  {
    id: 4,
    author: "sec_raven",
    handle: "@sec_raven",
    date: "4/12/2026",
    initials: "SE",
    title: "Volatility3 Cheatsheet",
    content: "Quick reference for memory forensics commands using Volatility 3",
    tags: ["#Knowledge", "#Tool"],
    files: [{ name: "volatility3_cheatsheet.pdf", size: "1.2 MB", type: "application/pdf" }],
  },
];

const AVATAR_COLORS = {
  WA: "#3a3a4a",
  NU: "#2a3a2a",
  SE: "#3a2a2a",
  default: "#2a2a3a",
};


function UploadForm({ onPublish }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const addFiles = (incoming) => {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !names.has(f.name))];
    });
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  function removeFile(name) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function handlePublish() {
    if (!title.trim()) { setError("Resource title is required."); return; }
    if (!content.trim()) { setError("Content is required."); return; }
    setError("");
    onPublish({
      title: title.trim(),
      content: content.trim(),
      files: files.map((f) => ({ name: f.name, size: formatBytes(f.size), type: f.type })),
    });
    setTitle("");
    setContent("");
    setFiles([]);
  }

  return (
    <div className="border border-[#1c1c1c] rounded-2xl overflow-hidden bg-[#080808]">
      {/* Form header */}
      <div className="border-b border-[#141414] flex items-center justify-between" style={{ paddingLeft: '28px', paddingRight: '28px', paddingTop: '14px', paddingBottom: '14px' }}>
        <span className="text-[9.5px] font-mono font-bold tracking-[0.22em] uppercase text-[#555]">
          Platform Resource Interface
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
          <span className="text-[9px] font-mono tracking-widest uppercase text-[#333]">Ready</span>
        </span>
      </div>

      <div className="space-y-6" style={{ paddingLeft: '28px', paddingRight: '28px', paddingTop: '28px', paddingBottom: '28px' }}>

        {/* Title */}
        <div>
          <label className="block text-[9.5px] font-mono font-bold tracking-[0.2em] uppercase text-[#555] mb-2">
            Resource Title <span className="text-[#333]">[Entry Required]</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(""); }}
            placeholder="enter resource title..."
            className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] font-mono text-[#ccc] outline-none focus:border-[#2a2a2a] transition-colors placeholder:text-[#2a2a2a]" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-[9.5px] font-mono font-bold tracking-[0.2em] uppercase text-[#555] mb-2">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setError(""); }}
            placeholder="enter resource content..."
            rows={4}
            className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] font-mono text-[#ccc] px-4 py-3.5 outline-none focus:border-[#2a2a2a] transition-colors resize-none placeholder:text-[#2a2a2a]"
          />
        </div>

        {/* File attachments */}
        <div>
          <label className="block text-[9.5px] font-mono font-bold tracking-[0.2em] uppercase text-[#555] mb-2">
            File Attachments
          </label>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              dragging
                ? "border-[#7F77DD]/50 bg-[#7F77DD]/5"
                : "border-dashed border-[#1e1e1e] hover:border-[#2e2e2e] bg-[#0a0a0a]"
            }`}
            style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '32px', paddingBottom: '32px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#7F77DD" : "#333"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <span className="text-[12px] font-mono text-[#444]">
              drag &amp; drop files here
            </span>
            <span className="text-[11px] font-mono text-[#2a2a2a]">or click to browse</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* Attached file list */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f) => (
                <div key={f.name} className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg" style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '10px', paddingBottom: '10px' }}>
                  <div className="w-7 h-7 rounded-md bg-[#141414] border border-[#222] flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] font-mono font-bold text-[#555]">FILE</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-mono text-[#ccc] truncate">{f.name}</p>
                    <p className="text-[10px] font-mono text-[#444] mt-0.5">{formatBytes(f.size)} · {f.type || "unknown"}</p>
                  </div>
                  <button
                    onClick={() => removeFile(f.name)}
                    className="text-[#333] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer flex-shrink-0" style={{ padding: '4px' }}
                    aria-label="Remove file"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-[11px] font-mono text-[#E24B4A]">{error}</p>
        )}

        {/* Publish button */}
        <button
          onClick={handlePublish}
          className="w-full bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl text-[12px] font-mono font-bold tracking-[0.18em] uppercase text-[#ccc] cursor-pointer hover:border-[#3a3a3a] hover:text-white hover:bg-[#111] transition-all active:scale-[0.99]" style={{ paddingTop: '14px', paddingBottom: '14px' }}
        >
          Publish Resource
        </button>
      </div>
    </div>
  );
}

// ─── Resource card ────────────────────────────────────────────────────────────

function ResourceCard({ resource, isBookmarked, onBookmarkToggle }) {
  const avatarColor = AVATAR_COLORS[resource.initials] || AVATAR_COLORS.default;

  return (
    <div className="border border-[#1c1c1c] rounded-2xl bg-[#080808] hover:border-[#242424] transition-colors flex flex-col" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}>

      {/* Author row + bookmark */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono font-bold text-[#888] flex-shrink-0 border border-[#222]"
            style={{ background: avatarColor }}
          >
            {resource.initials}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white leading-tight">{resource.author}</p>
            <p className="text-[11px] text-[#444] font-mono mt-0.5">
              {resource.handle} · {resource.date}
            </p>
          </div>
        </div>

        {/* Bookmark button */}
        <button
          onClick={() => onBookmarkToggle(resource.id)}
          className="flex-shrink-0 bg-transparent border-none cursor-pointer transition-colors mt-0.5"
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark resource"}
          style={{ padding: '4px' }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={isBookmarked ? "#7F77DD" : "none"}
            stroke={isBookmarked ? "#7F77DD" : "#444"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'all 0.15s ease' }}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Title & body */}
      <p className="text-[14px] font-bold text-white mb-1">{resource.title}</p>
      <p className="text-[13px] text-[#666] mb-4">{resource.content}</p>

      {/* File attachments */}
      {resource.files && resource.files.length > 0 && (
        <div className="space-y-2 mb-5">
          {resource.files.map((file) => (
            <div
              key={file.name}
              className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a]" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '14px', paddingBottom: '14px' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-mono font-bold text-[#555]">File</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-mono text-[#ccc] truncate">{file.name}</p>
                  <p className="text-[11px] font-mono text-[#444] mt-0.5">{file.size} · {file.type}</p>
                </div>
              </div>
              <div className="flex justify-end mt-3 border-t border-[#141414]" style={{ paddingTop: '12px' }}>
                <button className="bg-white text-[#080808] rounded-lg text-[11px] font-medium cursor-pointer hover:opacity-90 transition-opacity border-none" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '6px', paddingBottom: '6px' }}>
                  download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer — tags + comment */}
      <div className="flex items-center justify-between border-t border-[#111] mt-auto" style={{ paddingTop: '16px' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className={`text-[11px] font-mono rounded-full border cursor-pointer transition-colors ${
                tag === "#Resource"
                  ? "border-[#1D9E75]/50 text-[#1D9E75] bg-[#1D9E75]/5 hover:bg-[#1D9E75]/10"
                  : "border-[#333] text-[#666] bg-transparent hover:border-[#444] hover:text-[#888]"
              }`}
              style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '4px' }}
            >
              {tag}
            </span>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-[11px] font-mono text-[#444] hover:text-[#888] transition-colors bg-transparent border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg cursor-pointer" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          comment
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Resources() {
  const [resources, setResources] = useState(SAMPLE_RESOURCES);
  const [bookmarked, setBookmarked] = useState(new Set());
  const [view, setView] = useState("feed"); // "feed" | "upload"
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef(null);
  const searchRef = useRef(null);

  const filteredResources = query.trim()
    ? resources.filter((r) => {
        const q = query.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.files?.some((f) => f.name.toLowerCase().includes(q))
        );
      })
    : resources;

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }

  function handleBookmarkToggle(id) {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast("Bookmark removed.");
      } else {
        next.add(id);
        showToast("Resource bookmarked.");
      }
      return next;
    });
  }

  function handlePublish({ title, content, files }) {
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    setResources((prev) => [
      {
        id: Date.now(),
        author: "YOU",
        handle: "@you",
        date: dateStr,
        initials: "YO",
        title,
        content,
        tags: ["#Resource"],
        files,
      },
      ...prev,
    ]);
    setView("feed");
    showToast("Resource published.");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center text-[#e0e0e0]"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage: `url(${mainBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="bg-[#080808]/75 min-h-screen w-full">
        <div className="w-full max-w-[1200px] mx-auto flex flex-col items-center" style={{ paddingLeft: '32px', paddingRight: '32px', paddingTop: '48px', paddingBottom: '80px' }}>

          {/* Centered top section */}
          <div className="max-w-[600px] mx-auto">
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[18px] font-semibold text-white tracking-tight">Resources</h1>
                <p className="text-[11px] text-[#444] mt-0.5 font-mono tracking-wide">
                  {resources.length} entries · {bookmarked.size} saved
                </p><br />
              </div>
              <button
                onClick={() => { setView(view === "upload" ? "feed" : "upload"); setQuery(""); }}
                className={`flex items-center gap-2 rounded-lg text-[12px] font-mono tracking-wide border transition-all cursor-pointer ${
                  view === "upload"
                    ? "bg-[#111] border-[#2a2a2a] text-[#888] hover:text-white"
                    : "bg-white text-[#080808] border-white hover:opacity-90 font-semibold"
                }`}
                style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}
              >
                {view === "upload" ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back to feed
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add resource
                  </>
                )}
              </button>
            </div>

            {/* Search bar — only on feed view */}
            {view === "feed" && (
              <div className="relative mb-6">
                <svg
                  className="absolute top-1/2 -translate-y-1/2 text-[#333] pointer-events-none" style={{ left: '16px' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search by title, author, tag, or filename..."
                  className="w-full bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl text-[12.5px] font-mono text-[#ccc] outline-none focus:border-[#2a2a2a] transition-colors placeholder:text-[#2a2a2a]" style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '12px', paddingBottom: '12px' }}
                />
                {query && (
                  <button
                    onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#333] hover:text-[#666] transition-colors bg-transparent border-none cursor-pointer" style={{ padding: '4px' }}
                    aria-label="Clear search"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section divider */}
          <div className="flex items-center gap-3 mb-5">
            <p className="text-[9.5px] font-mono font-bold text-[#333] tracking-[0.18em] uppercase whitespace-nowrap">
              {view === "upload"
                ? "New Entry"
                : query
                ? `${filteredResources.length} result${filteredResources.length !== 1 ? "s" : ""}`
                : "Recent Entries"}
            </p>
            <div className="flex-1 h-px bg-[#151515]" />
          </div>

          {/* Upload form */}
          {view === "upload" && (
            <div className="max-w-[600px] mx-auto">
              <UploadForm onPublish={handlePublish} />
            </div>
          )}

          {/* Feed — responsive grid */}
          {view === "feed" && (
            filteredResources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredResources.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    isBookmarked={bookmarked.has(r.id)}
                    onBookmarkToggle={handleBookmarkToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p className="text-[12px] font-mono text-[#333]">No results for <span className="text-[#555]">"{query}"</span></p>
                <button
                  onClick={() => setQuery("")}
                  className="text-[11px] font-mono text-[#444] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
                >
                  Clear search
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] border border-[#2a2a2a] rounded-lg px-5 py-2.5 text-[12px] font-mono text-[#ccc] pointer-events-none whitespace-nowrap z-50 transition-all duration-200 ${
          toast.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}