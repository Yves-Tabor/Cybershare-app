import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import { resourcesAPI, authAPI, savedItemsAPI } from "../utils/api";
import { redirectToWelcomeAuth } from "../utils/authRedirect";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AVATAR_COLORS = {
  default: "#2a2a3a",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const CATEGORIES = ["Guides", "Tools", "Cheat Sheets", "Writeups", "Other"];

function UploadForm({ onPublish, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Guides");
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const arr = Array.from(incoming);
    const oversized = arr.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(
        `File${oversized.length > 1 ? "s" : ""} too large (max 10 MB): ${oversized.map((f) => f.name).join(", ")}`
      );
      return;
    }
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...arr.filter((f) => !names.has(f.name))];
    });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);

  function removeFile(name) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function handlePublish() {
    if (!title.trim()) {
      setError("Resource title is required.");
      return;
    }
    setError("");
    onPublish({
      title: title.trim(),
      content: description.trim(),
      url: url.trim(),
      category,
      files,
    });
    setTitle("");
    setDescription("");
    setUrl("");
    setCategory("Guides");
    setFiles([]);
  }

  return (
    <div className="border border-[#1c1c1c] rounded-2xl overflow-hidden bg-[#0a0a0a]">
      {/* Form header */}
      <div
        className="border-b border-[#222] flex items-center justify-between"
        style={{
          paddingLeft: "28px",
          paddingRight: "28px",
          paddingTop: "16px",
          paddingBottom: "16px",
        }}
      >
        <span className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-silver">
          Publish Platform Resource
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#666] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            style={{ padding: "4px" }}
            aria-label="Close"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div
        className="space-y-6"
        style={{
          paddingLeft: "28px",
          paddingRight: "28px",
          paddingTop: "28px",
          paddingBottom: "28px",
        }}
      >
        {/* Title */}
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white mb-2">
            Resource Title <span className="text-[#333]">[Entry Required]</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="enter resource title..."
            className="w-full bg-[#0a0a0a] border border-silver rounded-xl text-[13px] font-mono text-[#ccc] outline-none focus:border-[#2a2a2a] transition-colors placeholder:text-[#2a2a2a]"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "14px",
              paddingBottom: "14px",
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white mb-2">
            Description <span className="text-silver normal-case tracking-normal font-normal">— optional</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="brief description or details..."
            rows={3}
            className="w-full bg-[#0a0a0a] border border-silver rounded-xl text-[13px] font-mono text-[#ccc] outline-none focus:border-[#2a2a2a] transition-colors placeholder:text-[#2a2a2a] resize-none"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "14px",
              paddingBottom: "14px",
            }}
          />
        </div>

        {/* Resource URL / Link */}
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white mb-2">
            Resource Link / URL <span className="text-silver normal-case tracking-normal font-normal">— optional</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/resource"
            className="w-full bg-[#0a0a0a] border border-silver rounded-xl text-[13px] font-mono text-[#ccc] outline-none focus:border-[#2a2a2a] transition-colors placeholder:text-[#2a2a2a]"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "14px",
              paddingBottom: "14px",
            }}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-silver rounded-xl text-[13px] font-mono text-[#ccc] outline-none focus:border-[#2a2a2a] transition-colors"
            style={{
              paddingLeft: "16px",
              paddingRight: "16px",
              paddingTop: "14px",
              paddingBottom: "14px",
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-[#0a0a0a] text-[#ccc]">
                {cat}
              </option>
            ))}
          </select>
        </div>


        {/* File attachments */}
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white mb-2">
            File Attachments <span className="text-silver normal-case tracking-normal font-normal">— optional</span>
          </label>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              dragging
                ? "border-white/50 bg-white/5"
                : "border-dashed border-[#1e1e1e] hover:border-[#2e2e2e] bg-[#0a0a0a]"
            }`}
            style={{
              paddingLeft: "20px",
              paddingRight: "20px",
              paddingTop: "32px",
              paddingBottom: "32px",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={dragging ? "#7F77DD" : "#333"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <span className="text-[12px] font-mono text-silver">
              drag &amp; drop files here
            </span>
            <span className="text-[11px] font-mono text-gray">
              or click to browse
            </span>
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
                <div
                  key={f.name}
                  className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg"
                  style={{
                    paddingLeft: "14px",
                    paddingRight: "14px",
                    paddingTop: "10px",
                    paddingBottom: "10px",
                  }}
                >
                  <div className="w-7 h-7 rounded-md bg-[#141414] border border-[#222] flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] font-mono font-bold text-[#555]">
                      FILE
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-mono text-[#ccc] truncate">
                      {f.name}
                    </p>
                    <p className="text-[10px] font-mono text-[#444] mt-0.5">
                      {formatBytes(f.size)} · {f.type || "unknown"}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(f.name)}
                    className="text-[#333] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer flex-shrink-0"
                    style={{ padding: "4px" }}
                    aria-label="Remove file"
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
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
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
        <br />
        <button
          onClick={handlePublish}
          className="w-full bg-[#0e0e0e] border border-white rounded-xl text-[12px] font-mono font-bold tracking-[0.18em] uppercase text-[#ccc] cursor-pointer hover:border-[#3a3a3a] hover:text-white hover:bg-[#111] transition-all active:scale-[0.99]"
          style={{ paddingTop: "14px", paddingBottom: "14px" }}
        >
          Publish Resource
        </button>
      </div>
    </div>
  );
}

// ─── Resource detail modal ──────────────────────────────────────────────────────

function ResourceDetailModal({ resource, isBookmarked, onBookmarkToggle, currentUser, onDelete, onDownloadFile, onClose }) {
  const avatarColor = AVATAR_COLORS[resource.initials] || AVATAR_COLORS.default;
  const isOwner = Boolean(
    currentUser &&
    (
      (currentUser.id != null && resource.userId != null && Number(currentUser.id) === Number(resource.userId)) ||
      (currentUser.username && resource.author && currentUser.username.toLowerCase() === resource.author.toLowerCase())
    )
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      style={{ padding: '16px' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl shadow-2xl flex flex-col"
        style={{ animation: 'modalPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between border-b border-[#161616] flex-shrink-0"
          style={{ padding: '18px 24px' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-[#888] flex-shrink-0 border border-[#222]"
              style={{ background: avatarColor }}
            >
              {resource.initials}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-tight">{resource.author}</p>
              <p className="text-[10px] text-[#444] font-mono mt-0.5">{resource.handle} · {resource.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isOwner ? (
              <button
                onClick={() => { onDelete(resource.id); onClose(); }}
                className="bg-transparent border-none cursor-pointer text-[#555] hover:text-[#E24B4A] transition-colors rounded-lg"
                aria-label="Delete resource"
                style={{ padding: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => onBookmarkToggle(resource.id)}
                className="bg-transparent border-none cursor-pointer transition-colors rounded-lg"
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark resource'}
                style={{ padding: '6px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={isBookmarked ? '#7F77DD' : 'none'} stroke={isBookmarked ? '#7F77DD' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.15s ease' }}>
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-transparent border-none cursor-pointer text-[#555] hover:text-white transition-colors rounded-lg"
              aria-label="Close"
              style={{ padding: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ padding: '24px' }} className="flex flex-col gap-4 flex-1">
          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] font-mono rounded-full border ${
                    tag.startsWith('#') && tag !== '#Resource'
                      ? 'border-[#7F77DD]/50 text-[#7F77DD] bg-[#7F77DD]/5'
                      : tag === '#Resource'
                        ? 'border-[#1D9E75]/50 text-[#1D9E75] bg-[#1D9E75]/5'
                        : 'border-[#333] text-[#666]'
                  }`}
                  style={{ padding: '3px 10px' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h2 className="text-[17px] font-bold text-white leading-snug">{resource.title}</h2>

          {/* Description */}
          {resource.content && (
            <p className="text-[13px] text-[#777] leading-relaxed">{resource.content}</p>
          )}

          {/* URL link */}
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[12px] font-mono text-[#7F77DD] hover:underline w-fit"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Go to resource
            </a>
          )}

          {/* File attachments */}
          {resource.files && resource.files.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-mono font-bold text-[#444] uppercase tracking-[0.15em]">Attachments</p>
              {resource.files.map((file) => (
                <div
                  key={file.name}
                  className="border border-[#1a1a1a] rounded-xl bg-[#060606]"
                  style={{ padding: '14px 16px' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-center flex-shrink-0">
                      <span className="text-[7px] font-mono font-bold text-[#555]">FILE</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-mono text-[#ccc] truncate">{file.name}</p>
                      <p className="text-[10px] font-mono text-[#444] mt-0.5">{file.size} · {file.type}</p>
                    </div>
                    {!isOwner && (
                      <button
                        onClick={() => onDownloadFile(file.id, file.name)}
                        className="bg-white text-[#080808] rounded-lg text-[11px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none flex items-center gap-1.5 flex-shrink-0"
                        style={{ padding: '6px 14px' }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* URL-only download for non-publishers with no files */}
          {!isOwner && resource.url && (!resource.files || resource.files.length === 0) && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-2 self-start text-[11px] font-mono text-[#888] hover:text-white transition-colors border border-[#1e1e1e] hover:border-[#333] rounded-lg no-underline"
              style={{ padding: '7px 14px' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download resource
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compact resource row (click to open detail modal) ────────────────────────────

function ResourceCard({ resource, isBookmarked, onBookmarkToggle, currentUser, onDelete, onDownloadFile }) {
  const [open, setOpen] = useState(false);
  const avatarColor = AVATAR_COLORS[resource.initials] || AVATAR_COLORS.default;
  const isOwner = Boolean(
    currentUser &&
    (
      (currentUser.id != null && resource.userId != null && Number(currentUser.id) === Number(resource.userId)) ||
      (currentUser.username && resource.author && currentUser.username.toLowerCase() === resource.author.toLowerCase())
    )
  );

  const primaryTag = resource.tags.find((t) => t !== '#Resource') || resource.tags[0] || '';

  return (
    <>
      {/* Compact row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(true)}
        className="group flex items-center gap-3 border border-[#161616] hover:border-[#2a2a2a] rounded-xl bg-[#080808] hover:bg-[#0d0d0d] transition-all cursor-pointer select-none"
        style={{ padding: '14px 16px' }}
      >
        {/* Publisher avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-[#888] flex-shrink-0 border border-[#1e1e1e]"
          style={{ background: avatarColor }}
        >
          {resource.initials}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#ddd] group-hover:text-white transition-colors truncate leading-tight">
            {resource.title}
          </p>
          <p className="text-[10px] font-mono text-[#3a3a3a] mt-0.5 truncate">
            {resource.author} · {resource.date}
          </p>
        </div>

        {/* Right-side indicators */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Category badge */}
          {primaryTag && (
            <span
              className={`hidden sm:inline-block text-[9.5px] font-mono rounded-full border ${
                primaryTag.startsWith('#') && primaryTag !== '#Resource'
                  ? 'border-[#7F77DD]/40 text-[#7F77DD]/80 bg-[#7F77DD]/5'
                  : 'border-[#252525] text-[#555]'
              }`}
              style={{ padding: '2px 9px' }}
            >
              {primaryTag}
            </span>
          )}

          {/* File attachment indicator */}
          {resource.files && resource.files.length > 0 && (
            <span className="text-[#2e2e2e] group-hover:text-[#444] transition-colors" title="Has file attachments">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </span>
          )}
          {resource.url && (!resource.files || resource.files.length === 0) && (
            <span className="text-[#2e2e2e] group-hover:text-[#444] transition-colors" title="Has link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
          )}

          {/* Saved indicator dot */}
          {!isOwner && isBookmarked && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#7F77DD] flex-shrink-0" />
          )}

          {/* Open chevron */}
          <svg className="text-[#252525] group-hover:text-[#3a3a3a] transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Detail modal */}
      {open && (
        <ResourceDetailModal
          resource={resource}
          isBookmarked={isBookmarked}
          onBookmarkToggle={onBookmarkToggle}
          currentUser={currentUser}
          onDelete={onDelete}
          onDownloadFile={onDownloadFile}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Resources() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(new Set());
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef(null);
  const searchRef = useRef(null);

  // Fetch resources and current user on mount
  useEffect(() => {
    async function fetchResources() {
      try {
        // Fetch current user separately so a failure here doesn't break resources
        try {
          const userResponse = await authAPI.me();
          if (userResponse?.user) {
            setCurrentUser(userResponse.user);
          }
        } catch (userErr) {
          console.error("Failed to fetch current user:", userErr);
          if (userErr.status === 401) {
            redirectToWelcomeAuth(navigate);
            return;
          }
        }

        const data = await resourcesAPI.getAll();
        // Transform backend data to match frontend format
        const transformedResources = data.resources.map((r) => ({
          id: r.id,
          userId: r.user?.id ?? r.user_id ?? null,
          author: r.user?.username || r.username || "Unknown",
          handle: `@${r.user?.username || r.username || "unknown"}`,
          date: new Date(r.createdAt || r.created_at || Date.now()).toLocaleDateString(),
          initials: (r.user?.username || r.username || "??").slice(0, 2).toUpperCase(),
          title: r.title,
          content: r.description,
          url: r.url || null,
          tags: r.tags || (r.category ? [`#${r.category}`] : ["#Resource"]),
          files: r.files || [],
        }));
        setResources(transformedResources);

        // Fetch saved items to populate the initial bookmark state
        try {
          const savedData = await savedItemsAPI.getAll();
          const savedResourceIds = new Set(
            (savedData.items || []).filter((i) => i.type === "resource").map((i) => i.real_id)
          );
          setBookmarked(savedResourceIds);
        } catch (savedErr) {
          console.error("Failed to fetch saved items:", savedErr);
        }
      } catch (error) {
        console.error("Failed to fetch resources:", error);
        if (error.status === 401 || error.message === "API request failed") {
          redirectToWelcomeAuth(navigate);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchResources();
  }, [navigate]);

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
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      3000,
    );
  }

  async function handleDownloadFile(fileId, fileName) {
    try {
      await resourcesAPI.downloadFile(fileId, fileName);
    } catch (err) {
      console.error("Failed to download file:", err);
      showToast("Failed to download file.");
    }
  }

  async function handleBookmarkToggle(id) {
    const isBookmarked = bookmarked.has(id);
    
    // Optimistic update
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      if (isBookmarked) {
        await savedItemsAPI.unsave("resource", id);
        showToast("Removed from saved items");
      } else {
        await savedItemsAPI.save("resource", id);
        showToast("Saved resource");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to update saved status");
      // Revert on failure
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  }

  async function handleDelete(id) {
    try {
      await resourcesAPI.delete(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      showToast("Resource deleted.");
    } catch (error) {
      console.error("Failed to delete resource:", error);
      showToast("Failed to delete resource.");
    }
  }

  async function handlePublish({ title, content, url, category, files }) {
    // Close modal immediately
    setShowPublishModal(false);
    showToast("Publishing resource...");

    try {
      // Create the resource entry first
      const created = await resourcesAPI.create(title, content, url, category);
      const resourceId = created?.resource?.id || created?.id;

      // Upload each attached file to the newly created resource
      if (files && files.length > 0 && resourceId) {
        await Promise.all(
          files.map((file) => resourcesAPI.uploadFile(resourceId, file))
        );
      }

      // Refresh resources after publishing so file IDs are loaded
      const data = await resourcesAPI.getAll();
      const transformedResources = data.resources.map((r) => ({
        id: r.id,
        userId: r.user?.id ?? r.user_id ?? null,
        author: r.user?.username || r.username || "Unknown",
        handle: `@${r.user?.username || r.username || "unknown"}`,
        date: new Date(r.createdAt || r.created_at || Date.now()).toLocaleDateString(),
        initials: (r.user?.username || r.username || "??").slice(0, 2).toUpperCase(),
        title: r.title,
        content: r.description,
        url: r.url || null,
        tags: r.tags || (r.category ? [`#${r.category}`] : ["#Resource"]),
        files: r.files || [],
      }));
      setResources(transformedResources);
      showToast("Resource published.");
    } catch (error) {
      console.error("Failed to publish resource:", error);
      showToast("Failed to publish resource.");
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
      <div className="bg-[#080808]/75 min-h-screen w-full">
        <div
          className="w-full max-w-[1200px] mx-auto flex flex-col items-center"
          style={{
            paddingLeft: "32px",
            paddingRight: "32px",
            paddingTop: "48px",
            paddingBottom: "80px",
          }}
        >
          {/* Centered top section */}
          <div className="max-w-[600px] mx-auto">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-[18px] font-semibold text-white tracking-tight">
                  Resources
                </h1>
                <p className="text-[11px] text-[#444] mt-0.5 font-mono tracking-wide">
                  {resources.length} entries · {bookmarked.size} saved
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="flex items-center justify-center gap-2 rounded-xl text-[12.5px] font-mono font-semibold bg-white text-black hover:bg-[#eee] transition-colors cursor-pointer border-none shadow-sm"
                  style={{ padding: "10px 20px" }}
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
                  Publish Resource
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative mb-6">
              <svg
                className="absolute top-1/2 -translate-y-1/2 text-[#333] pointer-events-none"
                style={{ left: "16px" }}
                width="14"
                height="14"
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
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search by title, author, tag, or filename..."
                className="w-full bg-[#0a0a0a] border border-silver rounded-xl text-[12.5px] font-mono text-[#ccc] outline-none focus:border-[#2a2a2a] transition-colors placeholder:text-silver"
                style={{
                  paddingLeft: "40px",
                  paddingRight: "40px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                }}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#333] hover:text-[#666] transition-colors bg-transparent border-none cursor-pointer"
                  style={{ padding: "4px" }}
                  aria-label="Clear search"
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <br />
          </div>

          {/* Section divider */}
          <div className="flex items-center gap-3 mb-5">
            <p className="text-[9.5px] font-mono font-bold text-silver tracking-[0.18em] uppercase whitespace-nowrap">
              {query
                ? `${filteredResources.length} result${filteredResources.length !== 1 ? "s" : ""}`
                : "Recent Entries"}
            </p>
            <div className="flex-1 h-px bg-[#151515]" />
          </div>

          {/* Feed — responsive grid */}
          {filteredResources.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredResources.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  isBookmarked={bookmarked.has(r.id)}
                  onBookmarkToggle={handleBookmarkToggle}
                  currentUser={currentUser}
                  onDelete={handleDelete}
                  onDownloadFile={handleDownloadFile}
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
                stroke="#2a2a2a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-[12px] font-mono text-[#333]">
                {query ? (
                  <>No results for <span className="text-[#555]">"{query}"</span></>
                ) : (
                  "No published resources yet"
                )}
              </p>
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-[11px] font-mono text-[#444] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Publish Resource Modal Dialog */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowPublishModal(false)}
          style={{ padding: "16px" }}
        >
          <div className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-[#222] rounded-2xl shadow-2xl">
            <UploadForm
              onPublish={handlePublish}
              onClose={() => setShowPublishModal(false)}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] border border-[#2a2a2a] rounded-lg px-5 py-2.5 text-[12px] font-mono text-[#ccc] pointer-events-none whitespace-nowrap z-50 transition-all duration-200 ${
          toast.visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
