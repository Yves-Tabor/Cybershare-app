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

function UploadForm({ onPublish }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Guides");
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const CATEGORIES = ["Guides", "Tools", "Cheat Sheets", "Writeups", "Other"];

  const addFiles = (incoming) => {
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
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

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
      content: "",
      url: "",
      category,
      files,
    });
    setTitle("");
    setContent("");
    setUrl("");
    setCategory("Guides");
    setFiles([]);
  }

  return (
    <div className="border border-[#1c1c1c] rounded-2xl overflow-hidden bg-transparent">
      {/* Form header */}
      <div
        className="border-b border-white flex items-center justify-between"
        style={{
          paddingLeft: "28px",
          paddingRight: "28px",
          paddingTop: "14px",
          paddingBottom: "14px",
        }}
      >
        <span className="text-[9.5px] font-mono font-bold tracking-[0.22em] uppercase text-silver">
          Platform Resource Interface
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
        </span>
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

// ─── Resource card ────────────────────────────────────────────────────────────

function ResourceCard({ resource, isBookmarked, onBookmarkToggle, currentUser, onDelete }) {
  const avatarColor = AVATAR_COLORS[resource.initials] || AVATAR_COLORS.default;
  const isOwner = currentUser && currentUser.username === resource.author;

  return (
    <div
      className="border border-gray rounded-2xl hover:border-gray bg-[#111]/5 transition-colors flex flex-col"
      style={{
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingTop: "20px",
        paddingBottom: "20px",
      }}
    >
      {/* Author row + bookmark / delete */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono font-bold text-[#888] flex-shrink-0 border border-[#222]"
            style={{ background: avatarColor }}
          >
            {resource.initials}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white leading-tight">
              {resource.author}
            </p>
            <p className="text-[11px] text-[#444] font-mono mt-0.5">
              {resource.handle} · {resource.date}
            </p>
          </div>
        </div>

        {isOwner ? (
          <button
            onClick={() => onDelete(resource.id)}
            className="flex-shrink-0 bg-transparent border-none cursor-pointer text-[#555] hover:text-[#E24B4A] transition-colors mt-0.5"
            aria-label="Delete resource"
            style={{ padding: "4px" }}
          >
            <svg
              width="14"
              height="14"
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
        ) : (
          <button
            onClick={() => onBookmarkToggle(resource.id)}
            className="flex-shrink-0 bg-transparent border-none cursor-pointer transition-colors mt-0.5"
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark resource"}
            style={{ padding: "4px" }}
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
              style={{ transition: "all 0.15s ease" }}
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Title & body */}
      <p className="app-title-text text-[14px] font-bold text-white mb-1">
        {resource.title}
      </p>
      <p className="text-[13px] text-[#666] mb-3">{resource.content}</p>

      {/* URL Link */}
      {resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-mono text-[#7F77DD] hover:underline mb-4 flex items-center gap-1.5 w-fit"
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
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Go to resource
        </a>
      )}

      {/* File attachments */}
      {resource.files && resource.files.length > 0 && (
        <div className="space-y-2 mb-5">
          {resource.files.map((file) => (
            <div
              key={file.name}
              className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a]"
              style={{
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingTop: "14px",
                paddingBottom: "14px",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-mono font-bold text-[#555]">
                    File
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-mono text-[#ccc] truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-[#444] mt-0.5">
                    {file.size} · {file.type}
                  </p>
                </div>
              </div>
              <div
                className="flex justify-end mt-3 border-t border-[#141414]"
                style={{ paddingTop: "12px" }}
              >
                <a
                  href={`${API_BASE}/resources/files/${file.id}/download`}
                  download={file.name}
                  className="bg-white text-[#080808] rounded-lg text-[11px] font-medium cursor-pointer hover:opacity-90 transition-opacity border-none no-underline"
                  style={{
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    paddingTop: "6px",
                    paddingBottom: "6px",
                    display: "inline-block",
                  }}
                >
                  download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer — tags + comment */}
      <div
        className="flex items-center justify-between border-t border-[#111] mt-auto"
        style={{ paddingTop: "16px" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className={`text-[11px] font-mono rounded-full border cursor-pointer transition-colors ${
                tag.startsWith("#") && tag !== "#Resource"
                  ? "border-[#7F77DD]/50 text-[#7F77DD] bg-[#7F77DD]/5 hover:bg-[#7F77DD]/10"
                  : tag === "#Resource"
                    ? "border-[#1D9E75]/50 text-[#1D9E75] bg-[#1D9E75]/5 hover:bg-[#1D9E75]/10"
                    : "border-[#333] text-[#666] bg-transparent hover:border-[#444] hover:text-[#888]"
              }`}
              style={{
                paddingLeft: "12px",
                paddingRight: "12px",
                paddingTop: "4px",
                paddingBottom: "4px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        {resource.url && resource.url !== "https://cybershare.local" && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-mono text-[#444] hover:text-[#aaa] transition-colors border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg no-underline"
            style={{
              paddingLeft: "12px",
              paddingRight: "12px",
              paddingTop: "6px",
              paddingBottom: "6px",
            }}
            aria-label="Download resource"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            download
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Resources() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(new Set());
  const [view, setView] = useState("feed"); // "feed" | "upload"
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef(null);
  const searchRef = useRef(null);

  // Fetch resources and current user on mount
  useEffect(() => {
    async function fetchResources() {
      try {
        const userResponse = await authAPI.me();
        setCurrentUser(userResponse.user);

        const data = await resourcesAPI.getAll();
        // Transform backend data to match frontend format
        const transformedResources = data.resources.map((r) => ({
          id: r.id,
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
        const savedData = await savedItemsAPI.getAll();
        const savedResourceIds = new Set(
          savedData.items.filter((i) => i.type === "resource").map((i) => i.real_id)
        );
        setBookmarked(savedResourceIds);
      } catch (error) {
        console.error("Failed to fetch resources:", error);
        // Redirect to login if not authenticated
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
      setView("feed");
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

              <div
                className="flex bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl gap-1 self-start sm:self-center"
                style={{ padding: "4px" }}
              >
                <button
                  onClick={() => {
                    setView("feed");
                    setQuery("");
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg text-[12.5px] font-mono transition-colors cursor-pointer border-none ${view === "feed" ? "bg-white text-black font-semibold" : "bg-transparent text-[#aaa] hover:text-[#fff]"}`}
                  style={{ padding: "8px 16px" }}
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
                  Resource Feed
                </button>
                <button
                  onClick={() => {
                    setView("upload");
                    setQuery("");
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg text-[12.5px] font-mono transition-colors cursor-pointer border-none ${view === "upload" ? "bg-white text-black font-semibold" : "bg-transparent text-[#aaa] hover:text-[#fff]"}`}
                  style={{ padding: "8px 16px" }}
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
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Publish Resource
                </button>
              </div>
            </div>

            {/* Search bar — only on feed view */}
            {view === "feed" && (
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
            )}
            <br />
          </div>

          {/* Section divider */}
          <div className="flex items-center gap-3 mb-5">
            <p className="text-[9.5px] font-mono font-bold text-silver tracking-[0.18em] uppercase whitespace-nowrap">
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
          {view === "feed" &&
            (filteredResources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredResources.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    isBookmarked={bookmarked.has(r.id)}
                    onBookmarkToggle={handleBookmarkToggle}
                    currentUser={currentUser}
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
                  stroke="#2a2a2a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p className="text-[12px] font-mono text-[#333]">
                  No results for <span className="text-[#555]">"{query}"</span>
                </p>
                <button
                  onClick={() => setQuery("")}
                  className="text-[11px] font-mono text-[#444] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
                >
                  Clear search
                </button>
              </div>
            ))}
        </div>
      </div>

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
