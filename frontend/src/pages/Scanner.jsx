import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import mainBg from "../assets/mainBg.png";
import { scansAPI, authAPI } from "../utils/api";
import { redirectToWelcomeAuth } from "../utils/authRedirect";
import "./Scanner.css";

const SCAN_POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes max polling

const VIEWS = [
  { key: "scanner", label: "Scanner" },
  { key: "history", label: "History" },
  { key: "result", label: "Results" },
];

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

// ─── BG image placeholder ─────────────────────────────────────────────────────
// Replace SCANNER_BG_IMAGE with your actual image URL or import.
// e.g. import scannerBg from "./assets/scanner-bg.jpg";
// then: const SCANNER_BG_IMAGE = scannerBg;
const SCANNER_BG_IMAGE = null; // <-- your image here

// ─── Scan status sequence ─────────────────────────────────────────────────────
const SCAN_STEPS = [
  "Resolving host...",
  "Fetching HTTP headers...",
  "Analysing security policies...",
  "Running fingerprint checks...",
  "Checking disclosure vectors...",
  "Compiling report...",
  "Scan complete.",
];

const DISCLOSURE_TEXT = `By initiating a scan, you confirm that you have explicit authorization to conduct security testing on the target domain. This includes HTTP header analysis, technology fingerprinting, and information disclosure checks. Unauthorised scanning may violate applicable laws. Use responsibly.`;

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconShield({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconScan({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function IconLoader({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

// ─── Disclosure modal ─────────────────────────────────────────────────────────
function DisclosureModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 scanner-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[500px] bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl scanner-modal-content">
        <div className="flex items-center gap-2.5 mb-5">
          <IconShield size={15} className="text-[#7F77DD]" />
          <span className="text-[10.5px] font-mono font-bold tracking-[0.18em] uppercase text-[#7F77DD]">
            Authorization Disclosure
          </span>
        </div>
        <p className="text-[13px] text-[#888] leading-relaxed mb-7">
          {DISCLOSURE_TEXT}
        </p>
        <button
          onClick={onClose}
          className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg text-[12px] font-mono tracking-widest uppercase text-[#ccc] cursor-pointer hover:border-[#3a3a3a] hover:text-white transition-colors scanner-modal-button"
        >
          Understood
        </button>
      </div>
    </div>
  );
}

// ─── Scan Result Component ───────────────────────────────────────────────────────
function ScanResult({ scan }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const data = await scansAPI.getById(scan.id);
        setResults(data);
      } catch (error) {
        console.error("Failed to fetch scan results:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [scan.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader size={16} className="text-[#555]" />
        <span className="text-[12px] text-[#555] ml-2">Loading results...</span>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-[12px] font-mono text-[#2a2a2a]">
          Failed to load results
        </p>
      </div>
    );
  }

  const severityColors = {
    critical: "#E24B4A",
    high: "#E24B4A",
    medium: "#BA7517",
    low: "#639922",
    informational: "#7F77DD",
  };

  return (
    <div className="space-y-6">
      {/* Scan Summary */}
      <div className="border border-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-white">
              {results.scan.targetUrl}
            </p>
            <p className="text-[11px] text-[#555] mt-1">
              {new Date(results.scan.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[24px] font-bold"
              style={{
                color:
                  results.scan.securityScore >= 70
                    ? "#639922"
                    : results.scan.securityScore >= 40
                      ? "#BA7517"
                      : "#E24B4A",
              }}
            >
              {results.scan.securityScore}
            </p>
            <p className="text-[10px] text-[#555]">Security Score</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-[10px] text-[#555] mb-1">Critical</p>
            <p
              className="text-[18px] font-semibold"
              style={{ color: severityColors.critical }}
            >
              {results.severityCounts.critical}
            </p>
          </div>
          <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-[10px] text-[#555] mb-1">High</p>
            <p
              className="text-[18px] font-semibold"
              style={{ color: severityColors.high }}
            >
              {results.severityCounts.high}
            </p>
          </div>
          <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-[10px] text-[#555] mb-1">Medium</p>
            <p
              className="text-[18px] font-semibold"
              style={{ color: severityColors.medium }}
            >
              {results.severityCounts.medium}
            </p>
          </div>
          <div className="flex-1 bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-[10px] text-[#555] mb-1">Low</p>
            <p
              className="text-[18px] font-semibold"
              style={{ color: severityColors.low }}
            >
              {results.severityCounts.low}
            </p>
          </div>
        </div>
      </div>

      {/* Findings */}
      <div>
        <p className="text-[11px] font-semibold text-[#444] tracking-[0.12em] uppercase mb-4">
          Findings ({results.totalFindings})
        </p>
        {results.findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-[12px] text-[#555]">No findings detected</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.findings.map((result) => (
              <div
                key={result.id}
                className="border border-[#1a1a1a] rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[10px] font-mono rounded-md px-2 py-1"
                        style={{
                          background: severityColors[result.severity] + "20",
                          color: severityColors[result.severity],
                        }}
                      >
                        {result.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-[#555]">
                        {result.category}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-white mb-2">
                      {result.title}
                    </p>
                    {result.description && (
                      <p className="text-[12px] text-[#b0b3b8] mb-3">
                        {result.description}
                      </p>
                    )}
                    {result.recommendation && (
                      <div className="bg-[#1a2e1a] rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-[#639922] mb-1">
                          Recommendation
                        </p>
                        <p className="text-[11px] text-[#b0b3b8]">
                          {result.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Scanner() {
  const navigate = useNavigate();
  const [view, setView] = useState("scanner");
  const [url, setUrl] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [statusText, setStatusText] = useState("Waiting for command...");
  const [modalOpen, setModalOpen] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [redisStatus, setRedisStatus] = useState(null); // null = checking, true = ok, false = down
  const [user, setUser] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const pollStartRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Check Redis/service status and fetch user on mount
    async function checkServiceStatus() {
      try {
        const status = await scansAPI.getStatus();
        setRedisStatus(status?.redis?.available === true);
        if (!status?.scanningEnabled) {
          setServiceError(
            status?.message ||
            "Scan features are currently disabled because Redis is not running."
          );
        }
      } catch {
        // If the status endpoint fails, we'll let the actual scan attempt surface the error
        setRedisStatus(null);
      }
    }

    async function fetchUser() {
      try {
        const data = await authAPI.me();
        setUser(data.user);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    }

    checkServiceStatus();
    fetchUser();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Fetch scan history when switching to history view
  useEffect(() => {
    async function fetchHistory() {
      if (view === "history" || view === "result") {
        try {
          setLoading(true);
          const data = await scansAPI.getAll();
          setScanHistory(data.scans || []);
        } catch (error) {
          console.error("Failed to fetch scan history:", error);
          if (error.status === 401 || error.message === "API request failed") {
            redirectToWelcomeAuth(navigate);
          }
        } finally {
          setLoading(false);
        }
      }
    }
    fetchHistory();
  }, [view, navigate]);

  const canScan = url.trim().length > 0 && accepted && !scanning;

  function validateUrl(val) {
    try {
      const u = new URL(val.trim());
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function startScan() {
    if (!validateUrl(url)) {
      setUrlError("Enter a valid URL starting with https:// or http://");
      inputRef.current?.focus();
      return;
    }
    setUrlError("");
    setServiceError("");
    setScanning(true);
    setStepIndex(0);
    setStatusText(SCAN_STEPS[0]);

    try {
      const response = await scansAPI.create(url);
      const createdScan = response?.scan || response?.job;
      const scanId = createdScan?.id;

      if (!scanId) {
        throw new Error("Invalid response from server: scan ID missing.");
      }

      // Visual progress - sync with actual backend stages
      let i = 1;
      timerRef.current = setInterval(() => {
        if (i < SCAN_STEPS.length - 1) {
          setStepIndex(i);
          setStatusText(SCAN_STEPS[i]);
          i++;
        }
      }, 900);

      // Listen for real-time scan progress updates from backend
      const socket = io((import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, ""), {
        withCredentials: true,
        transports: ["polling", "websocket"],
      });

      socket.on("connect", () => {
        socket.emit("register-user", user?.id);
      });

      // Map backend stage events to frontend steps
      const stageToStepIndex = {
        "scan:running_headers": 1,      // "Fetching HTTP headers..."
        "scan:running_ssl": 2,          // "Analysing security policies..."
        "scan:running_dns": 3,          // "Running fingerprint checks..."
        "scan:running_cookies": 4,      // "Checking disclosure vectors..."
        "scan:running_tech": 4,         // "Checking disclosure vectors..."
        "scan:parsing": 5,              // "Compiling report..."
        "scan:completed": 6,            // "Scan complete."
      };

      Object.keys(stageToStepIndex).forEach(event => {
        socket.on(event, (data) => {
          const stepIdx = stageToStepIndex[event];
          if (stepIdx !== undefined) {
            setStepIndex(stepIdx);
            setStatusText(SCAN_STEPS[stepIdx]);
          }
        });
      });

      // Store socket ref for cleanup
      socketRef.current = socket;

      // Start polling - track start time to enforce max duration
      pollStartRef.current = Date.now();

      pollRef.current = setInterval(async () => {
        // Check if we've exceeded max poll duration
        if (Date.now() - pollStartRef.current > MAX_POLL_DURATION_MS) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (pollRef.current) clearInterval(pollRef.current);
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }
          setScanning(false);
          setStatusText("Scan timed out. Please check History for results.");
          return;
        }

        try {
          const pollRes = await scansAPI.getById(scanId);
          const latestScan = pollRes?.scan || pollRes;
          if (
            latestScan &&
            (latestScan.status === "completed" || latestScan.status === "failed")
          ) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
            if (socketRef.current) {
              socketRef.current.disconnect();
              socketRef.current = null;
            }

            setStepIndex(SCAN_STEPS.length - 1);
            setStatusText(
              latestScan.status === "completed"
                ? SCAN_STEPS[SCAN_STEPS.length - 1]
                : "Scan failed. Please try again.",
            );
            setScanning(false);
            window.dispatchEvent(
              new CustomEvent("cybershare:notifications-refresh"),
            );

            if (latestScan.status === "completed") {
              setSelectedScan(latestScan);
              setView("result");
            }
          }
        } catch (error) {
          if (error?.status !== 429) {
            console.error("Failed to poll scan status:", error);
            if (error?.status === 404 || error?.message?.toLowerCase().includes("not found")) {
              if (timerRef.current) clearInterval(timerRef.current);
              if (pollRef.current) clearInterval(pollRef.current);
              if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
              }
              setScanning(false);
              setStatusText("Scan was cleared or deleted.");
            }
          }
        }
      }, SCAN_POLL_INTERVAL_MS);
    } catch (error) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      console.error("Failed to start scan:", error);
      setScanning(false);
      setStepIndex(-1);

      if (error?.status === 503 || error?.message?.toLowerCase().includes("redis")) {
        setRedisStatus(false);
        setServiceError(
          error?.message ||
          "Scan features are currently disabled because Redis is not running. Please start Redis to enable scanning."
        );
        setStatusText("Service Unavailable: Redis required");
      } else {
        setStatusText("Scan failed. Please try again.");
      }

      if (error.status === 401 || error.message === "API request failed") {
        redirectToWelcomeAuth(navigate);
      }
    }
  }

  const isDone = stepIndex === SCAN_STEPS.length - 1 && !scanning;

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
        {/* ── Scanline overlay ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
          }}
        />

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col min-h-screen w-full max-w-[900px] mx-auto scanner-content">
          {/* Header */}
          <header className="flex items-center justify-between mb-14">
            <div className="flex items-center gap-2.5">
              <IconShield size={18} className="text-white" />
              <span className="text-[10.5px] font-mono font-bold tracking-[0.2em] uppercase text-white">
                Platform Security Layer
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Redis status indicator */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    redisStatus === null
                      ? "bg-[#555] animate-pulse"
                      : redisStatus
                      ? "bg-[#1D9E75] animate-pulse"
                      : "bg-[#E24B4A]"
                  }`}
                />
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#444]">
                  {redisStatus === null ? "Checking" : redisStatus ? "Online" : "Redis Offline"}
                </span>
              </div>
            </div>
          </header>

          {/* Toggle Bar */}
          <div className="flex bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl gap-1 mb-8 scanner-toggle-bar">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`flex items-center justify-center gap-2 rounded-lg text-[12px] font-mono transition-colors cursor-pointer border-none scanner-toggle-button ${view === v.key
                    ? "bg-white text-black"
                    : "bg-transparent text-[#aaa] hover:text-[#fff]"
                  }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Service Error Alert Banner */}
          {serviceError && (
            <div className="mb-6 p-4 rounded-xl bg-[#E24B4A]/10 border border-[#E24B4A]/30 flex items-start gap-3 text-[#E24B4A] shadow-lg">
              <IconShield size={18} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[12px] font-mono font-bold uppercase tracking-wider">
                  Service Unavailable (503)
                </p>
                <p className="text-[12px] text-[#ddd] mt-1 leading-relaxed">
                  {serviceError}
                </p>
              </div>
              <button
                onClick={() => setServiceError("")}
                className="text-[11px] font-mono text-[#888] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main card */}
          <main className="flex-1">
            {view === "scanner" && (
              <div className="border border-silver rounded-2xl overflow-hidden bg-gray backdrop-blur-sm">
                {/* Card top strip */}
                <div className="border-b border-[#141414] flex items-center gap-3 scanner-card-header">
                  <IconScan size={14} className="text-[#555]" />
                  <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-[#444]">
                    Target Configuration
                  </span>
                </div>

                <div className="space-y-7 scanner-card-body">
                  {/* URL input group */}
                  <div>
                    <label
                      htmlFor="scan-url"
                      className="block text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-gray-400 mb-2.5"
                    >
                      Enter website URL
                    </label>
                    <div className="relative">
                      <input
                        id="scan-url"
                        ref={inputRef}
                        type="text"
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          setUrlError("");
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && canScan && startScan()
                        }
                        placeholder="https://example.com"
                        disabled={scanning}
                        className={`w-full bg-[#0a0a0a] border rounded-xl text-[15px] font-mono text-silver outline-none transition-colors placeholder:text-[#282828] disabled:opacity-40 scanner-input ${urlError
                            ? "border-[#E24B4A]/60 focus:border-[#E24B4A]"
                            : "border-[#1e1e1e] focus:border-[#2e2e2e]"
                          }`}
                      />
                      {url && !scanning && (
                        <button
                          onClick={() => {
                            setUrl("");
                            setUrlError("");
                            inputRef.current?.focus();
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#333] hover:text-[#666] transition-colors bg-transparent border-none cursor-pointer scanner-clear-button"
                          aria-label="Clear URL"
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
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {urlError && (
                      <p className="text-[11px] text-[#E24B4A] mt-2 font-mono">
                        {urlError}
                      </p>
                    )}
                  </div>

                  {/* Authorization checkbox */}
                  <div
                    className={`border rounded-xl transition-colors cursor-pointer ${accepted
                        ? "border-[#7F77DD]/30 bg-[#7F77DD]/5"
                        : "border-dashed border-[#222] hover:border-[#2e2e2e]"
                      } scanner-checkbox`}
                    onClick={() => !scanning && setAccepted((v) => !v)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Custom checkbox */}
                      <div
                        className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${accepted
                            ? "bg-[#7F77DD] border-[#7F77DD]"
                            : "bg-transparent border-[#333]"
                          }`}
                      >
                        {accepted && (
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <p className="text-[12px] font-mono leading-relaxed text-silver select-none">
                        I acknowledge I have authorization to conduct a security
                        scan including header analysis, fingerprinting, and
                        disclosure checks.{" "}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalOpen(true);
                          }}
                          className="text-[#7F77DD] underline underline-offset-2 bg-transparent border-none cursor-pointer font-mono text-[12px] hover:text-[#9f99e8] transition-colors scanner-read-more"
                        >
                          Read more
                        </button>
                      </p>
                    </div>
                  </div>

                  {/* Scan button */}
                  <button
                    onClick={startScan}
                    disabled={!canScan}
                    className={`w-full rounded-xl text-[13px] font-mono tracking-[0.12em] uppercase border transition-all flex items-center justify-center gap-2.5 scanner-scan-button ${scanning
                        ? "bg-transparent border-[#1e1e1e] text-[#444] cursor-not-allowed"
                        : canScan
                          ? "bg-[#0f0f0f] border-[#7F77DD]/50 text-[#7F77DD] hover:bg-[#7F77DD]/8 hover:border-[#7F77DD] cursor-pointer active:scale-[0.99]"
                          : "bg-transparent border-[#181818] text-[#333] cursor-not-allowed"
                      }`}
                  >
                    {scanning ? (
                      <>
                        <IconLoader size={13} />
                        <span>Scanning...</span>
                      </>
                    ) : isDone ? (
                      <>
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
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Scan complete — run again</span>
                      </>
                    ) : (
                      <>
                        <IconScan size={13} />
                        <span>Start scanning</span>
                      </>
                    )}
                  </button>

                  {/* Progress steps — only visible once scan starts */}
                  {stepIndex >= 0 && (
                    <div className="border border-[#141414] rounded-xl space-y-2.5 scanner-progress">
                      <p className="text-[9.5px] font-mono font-bold tracking-[0.2em] uppercase text-[#333] mb-3.5">
                        Scan Progress
                      </p>
                      {SCAN_STEPS.map((step, i) => {
                        const done = i < stepIndex || isDone;
                        const active = i === stepIndex && scanning;
                        const pending = i > stepIndex && !isDone;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div
                              className={`w-1 h-1 rounded-full flex-shrink-0 transition-colors ${done
                                  ? "bg-[#1D9E75]"
                                  : active
                                    ? "bg-[#7F77DD] animate-pulse"
                                    : "bg-[#222]"
                                }`}
                            />
                            <span
                              className={`text-[11px] font-mono transition-colors ${done
                                  ? "text-[#3a6b4f]"
                                  : active
                                    ? "text-[#9f99e8]"
                                    : "text-[#2a2a2a]"
                                }`}
                            >
                              {step}
                            </span>
                            {done && (
                              <svg
                                className="ml-auto text-[#1D9E75] flex-shrink-0"
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === "history" && (
              <div className="border border-silver rounded-2xl overflow-hidden bg-gray backdrop-blur-sm">
                <div className="border-b border-[#141414] flex items-center justify-between scanner-card-header">
                  <div className="flex items-center gap-3">
                    <IconScan size={14} className="text-[#555]" />
                    <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-[#444]">
                      Scan History
                    </span>
                  </div>
                  {scanHistory.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await scansAPI.deleteAll();
                          setScanHistory([]);
                          if (selectedScan) setSelectedScan(null);
                        } catch (err) {
                          console.error("Failed to clear scan history:", err);
                        }
                      }}
                      className="text-[10px] font-mono uppercase text-[#E24B4A] hover:text-[#ff6b6b] bg-transparent border-none cursor-pointer transition-colors"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                <div className="scanner-card-body">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <IconLoader size={16} className="text-[#555]" />
                      <span className="text-[12px] text-[#555] ml-2">
                        Loading history...
                      </span>
                    </div>
                  ) : scanHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#222"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <p className="text-[12px] font-mono text-[#2a2a2a] mt-3">
                        No scan history yet
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {scanHistory.map((scan) => (
                        <div
                          key={scan.id}
                          onClick={() => {
                            setSelectedScan(scan);
                            setView("result");
                          }}
                          className="border border-[#1a1a1a] rounded-xl p-4 cursor-pointer hover:border-[#2a2a2a] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="app-title-text text-[12px] font-semibold text-white truncate">
                              {scan.targetUrl}
                            </span>
                            <span
                              className={`text-[10px] font-mono rounded-md px-2 py-1 ${scan.status === "completed"
                                  ? "bg-[#1a2e1a] text-[#639922]"
                                  : scan.status === "failed"
                                    ? "bg-[#2e1a1a] text-[#E24B4A]"
                                    : "bg-[#1a1a2e] text-[#7F77DD]"
                                }`}
                            >
                              {scan.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-[#555]">
                            <span>
                              {new Date(scan.createdAt).toLocaleString()}
                            </span>
                            {scan.securityScore && (
                              <span>Score: {scan.securityScore}/100</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === "result" && (
              <div className="border border-silver rounded-2xl overflow-hidden bg-gray backdrop-blur-sm">
                <div className="border-b border-[#141414] flex items-center gap-3 scanner-card-header">
                  <IconScan size={14} className="text-[#555]" />
                  <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-[#444]">
                    Scan Results
                  </span>
                </div>

                <div className="scanner-card-body">
                  {!selectedScan ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-[12px] font-mono text-[#2a2a2a]">
                        Select a scan from history to view results
                      </p>
                      <button
                        onClick={() => setView("history")}
                        className="mt-4 text-[#7F77DD] text-[12px] font-mono bg-transparent border-none cursor-pointer hover:underline"
                      >
                        Go to History
                      </button>
                    </div>
                  ) : (
                    <ScanResult scan={selectedScan} />
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Footer status line */}
          <footer className="mt-1 flex items-center justify-center gap-2.5">
            {scanning && <IconLoader size={10} className="text-[#444]" />}
            <span
              className={`text-[10px] font-mono tracking-[0.18em] uppercase transition-colors ${isDone ? "text-[#1D9E75]" : "text-[#444]"
                }`}
            >
              {statusText}
            </span>
          </footer>
        </div>
      </div>

      {modalOpen && <DisclosureModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
