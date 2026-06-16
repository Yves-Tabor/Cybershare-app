import { useEffect, useRef } from "react";

const THEME = {
  bg:              "#111111",
  gridLine:        "rgba(255,255,255,0.04)",
  gridSize:        52,
  green:           "#4ade80",
  greenHover:      "#6ee79a",
  greenFaint:      "rgba(74,222,128,0.10)",
  greenBorder:     "rgba(74,222,128,0.25)",
  greenCell:       "rgba(74,222,128,0.05)",
  greenCellBorder: "rgba(74,222,128,0.12)",
  red:             "#f87171",
  redFaint:        "rgba(248,113,113,0.10)",
  redBorder:       "rgba(248,113,113,0.25)",
  redGlow:         "rgba(248,113,113,0.18)",
  white:           "#ffffff",
  textMuted:       "rgba(255,255,255,0.45)",
  textNav:         "rgba(255,255,255,0.55)",
  cardBg:          "rgba(255,255,255,0.06)",
  cardBorder:      "rgba(255,255,255,0.12)",
  fontFamily:      "'Inter', system-ui, -apple-system, sans-serif",
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

const S = {
  page: {
    width: "100%",
    minHeight: "100vh",
    backgroundColor: THEME.bg,
    backgroundImage: [
      `linear-gradient(${THEME.gridLine} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${THEME.gridLine} 1px, transparent 1px)`,
    ].join(", "),
    backgroundSize: `${THEME.gridSize}px ${THEME.gridSize}px`,
    fontFamily: THEME.fontFamily,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    inset: 0,
    background: [
      `radial-gradient(ellipse 60% 50% at 50% 110%, ${THEME.redGlow} 0%, transparent 70%)`,
      `radial-gradient(ellipse 40% 40% at 20% 0%,   rgba(248,113,113,0.06) 0%, transparent 60%)`,
    ].join(", "),
    pointerEvents: "none",
    zIndex: 0,
  },
  cells: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: 1,
  },
  nav: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "22px 48px",
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: THEME.green,
    letterSpacing: "-0.02em",
    textDecoration: "none",
    fontFamily: THEME.fontFamily,
  },
  navList: {
    display: "flex",
    gap: 32,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  navLink: {
    fontSize: 14,
    color: THEME.textNav,
    textDecoration: "none",
    fontFamily: THEME.fontFamily,
    transition: "color 0.2s",
  },
  body: {
    position: "relative",
    zIndex: 2,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 40px 80px",
    textAlign: "center",
    gap: 24,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    background: THEME.redFaint,
    border: `1px solid ${THEME.redBorder}`,
    color: THEME.red,
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 14px",
    borderRadius: 999,
    letterSpacing: "0.04em",
    fontFamily: THEME.fontFamily,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: THEME.red,
    animation: "cs-blink 2s ease-in-out infinite",
  },
  errorCode: {
    fontSize: "clamp(96px, 18vw, 160px)",
    fontWeight: 900,
    letterSpacing: "-0.06em",
    lineHeight: 1,
    color: THEME.white,
    fontFamily: THEME.fontFamily,
  },
  scanBar: {
    width: "clamp(180px, 40%, 280px)",
    height: 3,
    background: `linear-gradient(90deg, transparent, ${THEME.red}, transparent)`,
    borderRadius: 999,
    margin: "-8px auto 0",
    animation: "cs-scan 3s ease-in-out infinite",
  },
  title: {
    fontSize: "clamp(18px, 3vw, 26px)",
    fontWeight: 700,
    color: THEME.white,
    letterSpacing: "-0.02em",
    marginTop: 4,
    fontFamily: THEME.fontFamily,
  },
  description: {
    fontSize: 14,
    color: THEME.textMuted,
    lineHeight: 1.75,
    maxWidth: 440,
    fontFamily: THEME.fontFamily,
  },
  emailLink: {
    color: THEME.green,
    textDecoration: "none",
    fontWeight: 600,
  },
  btnRow: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },
  // Stack trace collapsible
  detailsWrap: {
    width: "100%",
    maxWidth: 520,
    textAlign: "left",
  },
  detailsSummary: {
    fontSize: 12,
    color: THEME.textMuted,
    letterSpacing: "0.04em",
    cursor: "pointer",
    userSelect: "none",
    padding: "6px 0",
    fontFamily: THEME.fontFamily,
    listStyle: "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  stackBox: {
    marginTop: 10,
    background: "rgba(0,0,0,0.35)",
    border: `1px solid ${THEME.cardBorder}`,
    borderRadius: 10,
    padding: "14px 18px",
    fontFamily: "monospace",
    fontSize: 12,
    color: THEME.textMuted,
    lineHeight: 1.85,
    whiteSpace: "pre",
    overflowX: "auto",
  },
  stackLine0: {
    color: THEME.red,
    fontWeight: 700,
  },
  cornerMeta: {
    position: "absolute",
    bottom: 32,
    right: 48,
    fontSize: 11,
    color: "rgba(255,255,255,0.15)",
    fontFamily: "monospace",
    letterSpacing: "0.06em",
    lineHeight: 1.9,
    textAlign: "right",
    pointerEvents: "none",
    zIndex: 2,
  },
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
      // Highlighted cells use red tint to reinforce the error state
      cell.style.cssText = [
        "position:absolute",
        `left:${col * THEME.gridSize}px`,
        `top:${row * THEME.gridSize}px`,
        `width:${THEME.gridSize}px`,
        `height:${THEME.gridSize}px`,
        highlights.has(i)
          ? `background:rgba(248,113,113,0.04);border:1px solid rgba(248,113,113,0.10)`
          : "",
      ].join(";");
      frag.appendChild(cell);
    }
    wrap.appendChild(frag);
  }, []);

  return <div ref={ref} style={S.cells} />;
}

// ─── NAV LINK ─────────────────────────────────────────────────────
function NavLink({ children, href = "#" }) {
  return (
    <li>
      <a
        href={href}
        style={S.navLink}
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
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: primary ? 700 : 600,
    padding: "12px 24px",
    borderRadius: 10,
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: THEME.fontFamily,
    transition: "background 0.2s, transform 0.15s",
    border: primary ? "none" : `1px solid ${THEME.cardBorder}`,
    background: primary ? THEME.green : THEME.cardBg,
    color: primary ? "#0a1a10" : "rgba(255,255,255,0.75)",
  };

  return (
    <a
      href={href}
      onClick={onClick}
      style={base}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = primary ? THEME.greenHover : "rgba(255,255,255,0.10)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = primary ? THEME.green : THEME.cardBg;
        e.currentTarget.style.transform = "none";
      }}
    >
      {children}
    </a>
  );
}

// ─── STACK TRACE DETAILS ──────────────────────────────────────────
function StackTrace({ lines }) {
  return (
    <details style={S.detailsWrap}>
      <summary style={S.detailsSummary}>
        {/* chevron */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: THEME.textMuted }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        {CONTENT.detailsLabel}
      </summary>
      <div style={S.stackBox}>
        {lines.map((line, i) => (
          <div key={i} style={i === 0 ? S.stackLine0 : {}}>
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
  // Use real stack from prop if available, otherwise show placeholder
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
    <>
      <style>{`
        @keyframes cs-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes cs-scan  { 0%,100%{opacity:.4;transform:scaleX(.6)} 50%{opacity:1;transform:scaleX(1)} }
        details > summary::-webkit-details-marker { display:none; }
        details[open] > summary svg { transform:rotate(180deg); }
      `}</style>

      <div style={S.page}>

        <div style={S.glow} />
        <GridCells />

        {/* ── Navbar ── */}
        <nav style={S.nav}>
          <a href="/" style={S.logo}>{CONTENT.brand}</a>
        </nav>

        {/* ── Main content ── */}
        <main style={S.body}>

          {/* Status chip */}
          <div style={S.chip}>
            <div style={S.chipDot} />
            {CONTENT.chip}
          </div>

          {/* 500 display */}
          <div>
            <div style={S.errorCode}>
              <span>{CONTENT.headline[0]}</span>
              <span style={{ color: THEME.red }}>{CONTENT.headline[1]}</span>
              <span>{CONTENT.headline[2]}</span>
            </div>
            <div style={S.scanBar} />
          </div>

          {/* Title */}
          <h1 style={S.title}>
            {error?.message ? error.message : CONTENT.title}
          </h1>

          {/* Description */}
          <p style={S.description}>
            {CONTENT.description[0]}
            {CONTENT.description[1]}
            <a href={`mailto:${CONTENT.description[2]}`} style={S.emailLink}>
              {CONTENT.description[2]}
            </a>
            {CONTENT.description[3]}
          </p>

          {/* CTA buttons */}
          <div style={S.btnRow}>
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
        <div style={S.cornerMeta}>
          {CONTENT.cornerMeta.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>

      </div>
    </>
  );
}