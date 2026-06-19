import { useEffect, useRef } from "react";
import mainBg from "../assets/mainBg.png";
import "./Error.css";

const THEME = {
  green: "#4ade80",
  greenHover: "#6ee79a",
  red: "#f87171",
  redFaint: "rgba(248,113,113,0.10)",
  redBorder: "rgba(248,113,113,0.25)",
  redGlow: "rgba(248,113,113,0.18)",
  white: "#ffffff",
  textMuted: "rgba(255,255,255,0.45)",
  textNav: "rgba(255,255,255,0.55)",
  cardBg: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.12)",
  gridSize: 52,
  highlightFraction: 0.06,
};

const CONTENT = {
  brand: "CyberShare",
  nav: ["Home", "About", "Product", "Contact"],

  chip: "Something went wrong",
  headline: ["5", "0", "0"],
  title: "Internal server error",

  description: [
    "An unexpected error occurred on our end. Our team has been notified.",
    "\nIf the problem persists, please reach out to ",
    "support@cybershare.io",
    ".",
  ],

  primaryCta:   { label: "Try again",       href: "#" },
  secondaryCta: { label: "Back to home",    href: "/" },

  detailsLabel: "Show error details",

  stackTrace: [
    "Error: Failed to fetch resource",
    "  at fetchData (api/client.js:42:11)",
    "  at async loadPage (pages/index.jsx:17:5)",
    "  at async resolve (router/router.js:88:3)",
  ],

  cornerMeta: [
    "STATUS_CODE=500",
    "PATH=/error",
    "SRV=cybershare.io",
  ],
  highlightFraction: 0.06,
};


// ─── GRID CELLS ───────────────────────────────────────────────────
function GridCells() {
  const ref = useRef(null);

  useEffect(() => {
    const wrap = ref.current;
    if (!wrap) return;

    const W = wrap.offsetWidth  || window.innerWidth;
    const H = wrap.offsetHeight || window.innerHeight;
    const cols  = Math.ceil(W / THEME.gridSize);
    const rows  = Math.ceil(H / THEME.gridSize);
    const total = cols * rows;

    const highlights = new Set();
    while (highlights.size < Math.floor(total * CONTENT.highlightFraction)) {
      highlights.add(Math.floor(Math.random() * total));
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const cell = document.createElement("div");
      cell.style.cssText = [
        "position:absolute",
        `left:${col * THEME.gridSize}px`,
        `top:${row * THEME.gridSize}px`,
        `width:${THEME.gridSize}px`,
        `height:${THEME.gridSize}px`,
        highlights.has(i)
          ? "background:rgba(248,113,113,0.04);border:1px solid rgba(248,113,113,0.10)"
          : "",
      ].join(";");
      frag.appendChild(cell);
    }
    wrap.appendChild(frag);
  }, []);

  return <div ref={ref} className="error-cells" />;
}

// ─── NAV LINK ─────────────────────────────────────────────────────
function NavLink({ children, href = "#" }) {
  return (
    <li>
      <a
        href={href}
        className="error-nav-link"
        onMouseEnter={(e) => { e.currentTarget.style.color = THEME.white; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = THEME.textNav; }}
      >
        {children}
      </a>
    </li>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────
function Btn({ href, onClick, primary, children }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={primary ? "error-btn" : "error-btn-secondary"}
    >
      {children}
    </a>
  );
}

// ─── STACK TRACE DETAILS ──────────────────────────────────────────
function StackTrace({ lines }) {
  return (
    <details className="error-details-wrap">
      <summary className="error-details-summary">
        {/* chevron */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: THEME.textMuted }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        {CONTENT.detailsLabel}
      </summary>
      <div className="error-stack-box">
        {lines.map((line, i) => (
          <div key={i} className={i === 0 ? "error-stack-line-0" : ""}>
            {line}
          </div>
        ))}
      </div>
    </details>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
// Props:
//   error  — optional Error object (e.g. from React Router errorElement or ErrorBoundary)
//   reset  — optional () => void callback to retry (e.g. from ErrorBoundary)
export default function ErrorPage({ error, reset }) {
  const stackLines = error?.stack
    ? error.stack.split("\n").slice(0, 6)
    : CONTENT.stackTrace;

  const handleRetry = (e) => {
    e.preventDefault();
    if (reset) {
      reset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="error-page" style={{ backgroundImage: `url(${mainBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="error-glow" />
      <GridCells />

      {/* ── Navbar ── */}
      <nav className="error-nav">
        <a href="/" className="error-logo">{CONTENT.brand}</a>
      </nav>

      {/* ── Main content ── */}
      <main className="error-body">
        {/* Status chip */}
        <div className="error-chip">
          <div className="error-chip-dot" />
          {CONTENT.chip}
        </div>

        {/* 500 display */}
        <div>
          <div className="error-error-code">
            <span>{CONTENT.headline[0]}</span>
            <span style={{ color: THEME.red }}>{CONTENT.headline[1]}</span>
            <span>{CONTENT.headline[2]}</span>
          </div>
          <div className="error-scan-bar" />
        </div>

        {/* Title */}
        <h1 className="error-title">
          {error?.message ? error.message : CONTENT.title}
        </h1>

        {/* Description */}
        <p className="error-description">
          {CONTENT.description[0]}
          {CONTENT.description[1]}
          <a href={`mailto:${CONTENT.description[2]}`} className="error-email-link">
            {CONTENT.description[2]}
          </a>
          {CONTENT.description[3]}
        </p>

        {/* CTA buttons */}
        <div className="error-btn-row">
          <Btn href={CONTENT.primaryCta.href} onClick={handleRetry} primary>
            {/* Refresh icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {CONTENT.primaryCta.label}
          </Btn>

          <Btn href={CONTENT.secondaryCta.href}>
            {/* Home icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
              <path d="M9 21V12h6v9" />
            </svg>
            {CONTENT.secondaryCta.label}
          </Btn>
        </div>

        {/* Collapsible stack trace */}
        <StackTrace lines={stackLines} />
      </main>

      {/* Corner meta */}
      <div className="error-corner-meta">
        {CONTENT.cornerMeta.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}