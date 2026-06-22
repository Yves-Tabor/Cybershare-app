import { useState, useEffect, useRef } from "react";

const TAGS = {
  "Threat Intel": { bg: "#1a1a2e", color: "#7F77DD" },
  Vulnerability:  { bg: "#2e1a1a", color: "#E24B4A" },
  Tool:           { bg: "#1a2e1a", color: "#639922" },
  Discussion:     { bg: "#1a2a2e", color: "#1D9E75" },
  Resource:       { bg: "#2e2a1a", color: "#BA7517" },
};

const AVATAR_COLORS = [
  "#534AB7", "#0F6E56", "#993C1D",
  "#185FA5", "#854F0B", "#993556",
];

const SAMPLE_AUTHORS = [
  "alex_hunt", "sec_raven", "nullbyte", "cypher_x",
  "root_kai", "patchwatcher", "0xmira", "defcon_jay",
  "vxresearch", "threat_ly",
];

const SAMPLE_BODIES = [
  "New CVE dropped affecting OpenSSL 3.x — patch immediately if you're running it in prod. PoC is already circulating on underground forums.",
  "Interesting lateral movement technique observed in the wild: attackers are abusing WMI subscriptions to maintain persistence without touching disk.",
  "Just pushed v2.3 of my network recon tool — now supports passive fingerprinting and outputs to JSON/CSV. Feedback welcome.",
  "Anyone else seeing a spike in Cobalt Strike beacon traffic this week? Our sensors lit up Tuesday night across multiple clients.",
  "Deep dive on the recent supply chain attack — the threat actor embedded a backdoor in a widely-used npm package with 2M weekly downloads.",
  "Reminder: if you're still using SHA-1 anywhere, stop. It's 2026. Here's a migration guide I put together for legacy codebases.",
  "Built a YARA rule set for the new ransomware family targeting healthcare. Sharing it here — community testing appreciated.",
  "Writeup on my CTF win this weekend: exploited a use-after-free in a custom memory allocator. Full chain including privesc.",
  "Spotted a phishing campaign impersonating major cloud providers. The kit is surprisingly polished — includes real-time OTP relay.",
  "Quick tip: set up canary tokens in your S3 buckets. Caught an unauthorized access attempt last night that our SIEM missed.",
  "Research paper on LLM-assisted malware obfuscation is out — raises some serious questions about AI-generated evasion techniques.",
  "New DNS tunneling variant bypasses most corporate proxies. Technical breakdown with packet captures in the comments.",
  "Heads up: a popular VPN provider was silently logging traffic despite their no-log policy — confirmed by independent audit.",
  "Anyone built integrations between their SOAR and Shodan? Looking to automate asset exposure checks into incident response playbooks.",
  "Kernel exploit for the scheduler bug from last month now has a stable PoC. Privilege escalation on unpatched Linux 6.x kernels.",
  "Released a free threat intel feed aggregator that normalises IOCs from 15 sources into a single STIX 2.1 bundle.",
  "Monthly red team debrief: we got domain admin in 4 hours via a printer driver vulnerability most blue teams don't monitor.",
  "PSA: the Tor browser had a deanonymisation bug for 3 months before it was patched. Update if you haven't already.",
  "Wrote a short guide on hardening SSH configs — covers ciphers, host key algorithms and jump host setups. Happy to share.",
  "Memory forensics challenge: can you find the injected shellcode in this dump? Posting the answer next Friday.",
  "Log4Shell is still being actively exploited in 2026 — unbelievable but our honeypots confirm it. Patch your legacy Java apps.",
  "New malware family uses DNS-over-HTTPS for C2 — makes traditional network detection nearly useless. Details in thread.",
  "Our blue team blocked a BEC attempt that would have cost $340k — the attacker compromised an email account via an unpatched Outlook bug.",
  "Fuzzing methodology series part 3: coverage-guided fuzzing with libFuzzer on a closed-source binary using emulation.",
  "If you're not testing for SSRF in your bug bounty scope you're leaving money on the table. Here's my checklist.",
  "APT group attributed to nation-state actor now using legitimate cloud storage for payload staging — harder to block without user impact.",
  "Tool release: passive subdomain discovery via certificate transparency logs — no active scanning, stays under the radar.",
  "Malware analysis stream recap: reverse engineered a banking trojan live, covering string decryption, config extraction and C2 comms.",
  "CVE triage tip: not all criticals are equal — focus on exploitability, asset exposure and blast radius, not just CVSS score.",
  "Blue team win: detected a living-off-the-land attack using only Windows Event Log correlation. No EDR needed. Sharing the sigma rules.",
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

function buildSamplePosts() {
  return SAMPLE_BODIES.map((body, i) => {
    const author = SAMPLE_AUTHORS[i % SAMPLE_AUTHORS.length];
    return {
      id: i,
      author,
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      initials: author.slice(0, 2).toUpperCase(),
      cat: CATS[i % CATS.length],
      body,
      likes: Math.floor(Math.random() * 80) + 1,
      comments: Math.floor(Math.random() * 20),
      liked: false,
      ts: Date.now() - (i * 1000 * 60 * 17 + Math.random() * 60000 * 60),
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostCard({ post, onLike }) {
  const tag = TAGS[post.cat] || TAGS["Discussion"];
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl px-5 py-4 hover:border-[#2e2e2e] transition-colors">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
          style={{ background: post.avatarColor }}
        >
          {post.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white leading-tight">{post.author}</div>
          <div className="text-[11px] text-[#555] mt-0.5">{timeAgo(post.ts)}</div>
        </div>
        <span
          className="text-[11px] px-2.5 py-1 rounded-md font-medium flex-shrink-0 tracking-wide"
          style={{ background: tag.bg, color: tag.color }}
        >
          {post.cat}
        </span>
      </div>

      {/* Body */}
      <p className="text-[13.5px] text-[#b0b3b8] leading-[1.65] mb-4 pl-[calc(2.25rem+0.75rem)]">
        {post.body}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-5 pl-[calc(2.25rem+0.75rem)]">
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 text-[12px] bg-transparent border-none cursor-pointer transition-colors"
          style={{ color: post.liked ? "#E24B4A" : "#555" }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="tabular-nums">{post.likes}</span>
        </button>

        <button className="flex items-center gap-1.5 text-[12px] text-[#555] hover:text-[#888] bg-transparent border-none cursor-pointer transition-colors">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="tabular-nums">{post.comments}</span>
        </button>

        <button className="flex items-center gap-1.5 text-[12px] text-[#555] hover:text-[#888] bg-transparent border-none cursor-pointer transition-colors ml-auto">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
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
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {pages.map((p, idx) =>
        p.type === "ellipsis" ? (
          <span key={`e-${idx}`} className="text-[12px] text-[#444] w-8 text-center">…</span>
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
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#151515] border border-[#2a2a2a] text-[#777] text-[13px] cursor-pointer transition-colors hover:bg-[#1e1e1e] hover:text-white disabled:opacity-25 disabled:cursor-default"
        aria-label="Next"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

function CreatePostModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("Threat Intel");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      setError("Please fill in both title and content.");
      return;
    }
    onSubmit({ title: title.trim(), body: body.trim(), cat });
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-[540px] p-6">
        {/* Modal header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-white">Create a post</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-[#555] hover:text-white hover:bg-[#1e1e1e] cursor-pointer transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[#555] uppercase tracking-widest mb-1.5">Title</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="Give your post a title…"
              maxLength={120}
              className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg text-[#e0e0e0] text-[13px] px-3.5 py-2.5 outline-none focus:border-[#3a3a3a] transition-colors placeholder:text-[#3a3a3a]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#555] uppercase tracking-widest mb-1.5">Category</label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg text-[#e0e0e0] text-[13px] px-3.5 py-2.5 outline-none focus:border-[#3a3a3a] transition-colors"
            >
              {CATS.map((c) => (
                <option key={c} value={c} style={{ background: "#111" }}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#555] uppercase tracking-widest mb-1.5">Content</label>
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setError(""); }}
              placeholder="Share something with the community…"
              rows={5}
              className="w-full bg-[#0d0d0d] border border-[#252525] rounded-lg text-[#e0e0e0] text-[13px] px-3.5 py-2.5 outline-none focus:border-[#3a3a3a] transition-colors resize-none placeholder:text-[#3a3a3a]"
            />
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-[#E24B4A] mt-3">{error}</p>
        )}

        <div className="flex justify-end items-center gap-2.5 mt-5 pt-4 border-t border-[#1a1a1a]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent border border-[#2a2a2a] rounded-lg text-[#777] text-[13px] cursor-pointer hover:text-[#ccc] hover:border-[#3a3a3a] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#080808] rounded-lg text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1e1e1e] border border-[#333] rounded-lg px-5 py-2.5 text-[13px] text-[#e0e0e0] pointer-events-none whitespace-nowrap z-[200] transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  const [posts, setPosts] = useState(() => buildSamplePosts());
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });
  const feedRef = useRef(null);
  const toastTimer = useRef(null);

  const totalPages = Math.ceil(posts.length / PER_PAGE);
  const slice = posts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function showToast(message) {
    clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }

  function handleLike(id) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  }

  function handlePageChange(p) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCreatePost({ title, body, cat }) {
    const newPost = {
      id: Date.now(),
      author: "you",
      avatarColor: "#534AB7",
      initials: "YO",
      cat,
      body: `${title} — ${body}`,
      likes: 0,
      comments: 0,
      liked: false,
      ts: Date.now(),
    };
    setPosts((prev) => [newPost, ...prev]);
    setPage(1);
    setModalOpen(false);
    showToast("Post published!");
  }

  return (
    <div className="bg-[#080808] min-h-screen text-[#e0e0e0]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[700px] mx-auto px-6 pt-8 pb-16">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-7">
          <h1 className="text-[20px] font-semibold text-white tracking-tight">Home</h1>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#080808] rounded-lg text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create post
          </button>
        </div>

        {/* Quick nav */}
        <div className="flex gap-2.5 mb-8">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#141414] border border-[#252525] rounded-lg text-[#aaa] text-[13px] font-medium cursor-pointer hover:bg-[#1a1a1a] hover:text-white hover:border-[#333] transition-all">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Community
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#141414] border border-[#252525] rounded-lg text-[#aaa] text-[13px] font-medium cursor-pointer hover:bg-[#1a1a1a] hover:text-white hover:border-[#333] transition-all">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            Scanner
          </button>
        </div>

        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[10.5px] font-semibold text-[#444] tracking-[0.12em] uppercase">
            Recent posts
          </p>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
        </div>

        {/* Feed */}
        <div ref={feedRef} className="flex flex-col gap-3">
          {slice.map((post) => (
            <PostCard key={post.id} post={post} onLike={handleLike} />
          ))}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      {modalOpen && (
        <CreatePostModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreatePost}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}