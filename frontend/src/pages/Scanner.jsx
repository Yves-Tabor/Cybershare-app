import { useState, useRef } from "react";
import mainBg from "../assets/mainBg.png";

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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconScan({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function IconLoader({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

// ─── Disclosure modal ─────────────────────────────────────────────────────────
function DisclosureModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" style={{ padding: '24px' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[500px] bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl" style={{ padding: '28px' }}>
        <div className="flex items-center gap-2.5 mb-5">
          <IconShield size={15} className="text-[#7F77DD]" />
          <span className="text-[10.5px] font-mono font-bold tracking-[0.18em] uppercase text-[#7F77DD]">
            Authorization Disclosure
          </span>
        </div>
        <p className="text-[13px] text-[#888] leading-relaxed mb-7">{DISCLOSURE_TEXT}</p>
        <button
          onClick={onClose}
          className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg text-[12px] font-mono tracking-widest uppercase text-[#ccc] cursor-pointer hover:border-[#3a3a3a] hover:text-white transition-colors" style={{ paddingTop: '10px', paddingBottom: '10px' }}
        >
          Understood
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Scanner() {
  const [url, setUrl] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [statusText, setStatusText] = useState("Waiting for command...");
  const [modalOpen, setModalOpen] = useState(false);
  const [urlError, setUrlError] = useState("");
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const canScan = url.trim().length > 0 && accepted && !scanning;

  function validateUrl(val) {
    try {
      const u = new URL(val.trim());
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function startScan() {
    if (!validateUrl(url)) {
      setUrlError("Enter a valid URL starting with https:// or http://");
      inputRef.current?.focus();
      return;
    }
    setUrlError("");
    setScanning(true);
    setStepIndex(0);
    setStatusText(SCAN_STEPS[0]);

    let i = 1;
    timerRef.current = setInterval(() => {
      if (i < SCAN_STEPS.length) {
        setStepIndex(i);
        setStatusText(SCAN_STEPS[i]);
        i++;
      } else {
        clearInterval(timerRef.current);
        setScanning(false);
      }
    }, 900);
  }

  const isDone = stepIndex === SCAN_STEPS.length - 1 && !scanning;

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
      <div className="bg-transparent min-h-screen">
      {/* ── Scanline overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-[900px] mx-auto" style={{ paddingLeft: '32px', paddingRight: '32px', paddingTop: '48px', paddingBottom: '80px' }}>

        {/* Header */}
        <header className="flex items-center justify-between mb-14">
          <div className="flex items-center gap-2.5">
            <IconShield size={18} className="text-white" />
            <span className="text-[10.5px] font-mono font-bold tracking-[0.2em] uppercase text-white">
              Platform Security Layer
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#444]">Online</span>
          </div>
        </header>

        {/* Main card */}
        <main className="flex-1">
          <div className="border border-silver rounded-2xl overflow-hidden bg-gray backdrop-blur-sm">

            {/* Card top strip */}
            <div className="border-b border-[#141414] flex items-center gap-3" style={{ paddingLeft: '28px', paddingRight: '28px', paddingTop: '16px', paddingBottom: '16px' }}>
              <IconScan size={14} className="text-[#555]" />
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-[#444]">
                Target Configuration
              </span>
            </div>

            <div className="space-y-7" style={{ paddingLeft: '28px', paddingRight: '28px', paddingTop: '32px', paddingBottom: '32px' }}>

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
                    onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && canScan && startScan()}
                    placeholder="https://example.com"
                    disabled={scanning}
                    className={`w-full bg-[#0a0a0a] border rounded-xl text-[15px] font-mono text-silver outline-none transition-colors placeholder:text-[#282828] disabled:opacity-40 ${
                      urlError
                        ? "border-[#E24B4A]/60 focus:border-[#E24B4A]"
                        : "border-[#1e1e1e] focus:border-[#2e2e2e]"
                    }`}
                    style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '16px', paddingBottom: '16px' }}
                  />
                  {url && !scanning && (
                    <button
                      onClick={() => { setUrl(""); setUrlError(""); inputRef.current?.focus(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#333] hover:text-[#666] transition-colors bg-transparent border-none cursor-pointer" style={{ padding: '4px' }}
                      aria-label="Clear URL"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                {urlError && (
                  <p className="text-[11px] text-[#E24B4A] mt-2 font-mono">{urlError}</p>
                )}
              </div>

              {/* Authorization checkbox */}
              <div
                className={`border rounded-xl transition-colors cursor-pointer ${
                  accepted
                    ? "border-[#7F77DD]/30 bg-[#7F77DD]/5"
                    : "border-dashed border-[#222] hover:border-[#2e2e2e]"
                }`}
                style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '16px', paddingBottom: '16px' }}
                onClick={() => !scanning && setAccepted((v) => !v)}
              >
                <div className="flex items-start gap-4">
                  {/* Custom checkbox */}
                  <div
                    className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                      accepted
                        ? "bg-[#7F77DD] border-[#7F77DD]"
                        : "bg-transparent border-[#333]"
                    }`}
                  >
                    {accepted && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[12px] font-mono leading-relaxed text-silver select-none">
                    I acknowledge I have authorization to conduct a security scan including header analysis, fingerprinting, and disclosure checks.{" "}
                    <button
                      onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
                      className="text-[#7F77DD] underline underline-offset-2 bg-transparent border-none cursor-pointer font-mono text-[12px] hover:text-[#9f99e8] transition-colors" style={{ padding: '0' }}
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
                className={`w-full rounded-xl text-[13px] font-mono tracking-[0.12em] uppercase border transition-all flex items-center justify-center gap-2.5 ${
                  scanning
                    ? "bg-transparent border-[#1e1e1e] text-[#444] cursor-not-allowed"
                    : canScan
                    ? "bg-[#0f0f0f] border-[#7F77DD]/50 text-[#7F77DD] hover:bg-[#7F77DD]/8 hover:border-[#7F77DD] cursor-pointer active:scale-[0.99]"
                    : "bg-transparent border-[#181818] text-[#333] cursor-not-allowed"
                }`}
                style={{ paddingTop: '16px', paddingBottom: '16px' }}
              >
                {scanning ? (
                  <>
                    <IconLoader size={13} />
                    <span>Scanning...</span>
                  </>
                ) : isDone ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <div className="border border-[#141414] rounded-xl space-y-2.5" style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '5px', paddingBottom: '5px' }}>
                  <p className="text-[9.5px] font-mono font-bold tracking-[0.2em] uppercase text-[#333] mb-3.5">
                    Scan Progress
                  </p>
                  {SCAN_STEPS.map((step, i) => {
                    const done = i < stepIndex || isDone;
                    const active = i === stepIndex && scanning;
                    const pending = i > stepIndex && !isDone;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-1 h-1 rounded-full flex-shrink-0 transition-colors ${
                          done ? "bg-[#1D9E75]" : active ? "bg-[#7F77DD] animate-pulse" : "bg-[#222]"
                        }`} />
                        <span className={`text-[11px] font-mono transition-colors ${
                          done ? "text-[#3a6b4f]" : active ? "text-[#9f99e8]" : "text-[#2a2a2a]"
                        }`}>
                          {step}
                        </span>
                        {done && (
                          <svg className="ml-auto text-[#1D9E75] flex-shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        </main>

        {/* Footer status line */}
        <footer className="mt-1 flex items-center justify-center gap-2.5">
          {scanning && <IconLoader size={10} className="text-[#444]" />}
          <span className={`text-[10px] font-mono tracking-[0.18em] uppercase transition-colors ${
            isDone ? "text-[#1D9E75]" : "text-[#444]"
          }`}>
            {statusText}
          </span>
        </footer>

      </div>
      </div>

      {modalOpen && <DisclosureModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}