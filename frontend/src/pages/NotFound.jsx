import { useEffect, useRef } from "react";

const THEME = {
  bg:          "#111111",
  gridLine:    "rgba(255,255,255,0.04)",
  gridSize:    52,
  green:       "#4ade80",
  greenHover:  "#6ee79a",
  greenGlow:   "rgba(74,222,128,0.25)",
  greenFaint:  "rgba(74,222,128,0.10)",
  greenBorder: "rgba(74,222,128,0.25)",
  greenCell:   "rgba(74,222,128,0.05)",
  greenCellBorder: "rgba(74,222,128,0.12)",
  white:       "#ffffff",
  textMuted:   "rgba(255,255,255,0.45)",
  textNav:     "rgba(255,255,255,0.55)",
  cardBg:      "rgba(255,255,255,0.06)",
  cardBorder:  "rgba(255,255,255,0.12)",
  fontFamily:  "'Inter', system-ui, -apple-system, sans-serif",
};

const CONTENT = {
  brand: "CyberShare",
  chip: "Error 404",
  headline: ["4", "0", "4"],
  title: "Page not found",
  description: [
    "This route doesn't exist on CyberShare.",
    "\nIt may have been moved, deleted, or you followed a broken link.",
  ],
  primaryCta:   { label: "Back to home", href: "/" },
  secondaryCta: { label: "Go back",      href: "#",  onClick: () => window.history.back() },
  cornerMeta: [
    "STATUS_CODE=404",
    "PATH=/not-found",
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
      `radial-gradient(ellipse 60% 50% at 50% 110%, rgba(34,197,94,0.12) 0%, transparent 70%)`,
      `radial-gradient(ellipse 40% 40% at 80% 0%,  rgba(34,197,94,0.06) 0%, transparent 60%)`,
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
    background: THEME.greenFaint,
    border: `1px solid ${THEME.greenBorder}`,
    color: THEME.green,
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 14px",
    borderRadius: 999,
    letterSpacing: "0.04em",
    fontFamily: THEME.fontFamily,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: THEME.green,
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
    background: `linear-gradient(90deg, transparent, ${THEME.green}, transparent)`,
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
    maxWidth: 420,
    fontFamily: THEME.fontFamily,
    whiteSpace: "pre-line",
  },
  code: {
    color: THEME.green,
    fontFamily: "monospace",
    background: THEME.greenFaint,
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 13,
  },
  btnRow: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 8,
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
    border: "none",
    cursor: "pointer",
    fontFamily: THEME.fontFamily,
    transition: "background 0.2s, transform 0.15s",
    background: primary ? THEME.green : THEME.cardBg,
    color: primary ? "#0a1a10" : "rgba(255,255,255,0.75)",
    ...(primary ? {} : { border: `1px solid ${THEME.cardBorder}` }),
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.background = primary ? THEME.greenHover : "rgba(255,255,255,0.10)";
    e.currentTarget.style.transform = "translateY(-1px)";
  };
  const handleMouseLeave = (e) => {
    e.currentTarget.style.background = primary ? THEME.green : THEME.cardBg;
    e.currentTarget.style.transform = "none";
  };

  return (
    <a
      href={href}
      onClick={onClick}
      style={base}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </a>
  );
}

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
          ? `background:${THEME.greenCell};border:1px solid ${THEME.greenCellBorder}`
          : "",
      ].join(";");
      frag.appendChild(cell);
    }
    wrap.appendChild(frag);
  }, []);

  return <div ref={ref} style={S.cells} />;
}

function NavLink({ children, href = "#" }) {
  const handleEnter = (e) => { e.currentTarget.style.color = THEME.white; };
  const handleLeave = (e) => { e.currentTarget.style.color = THEME.textNav; };
  return (
    <li>
      <a
        href={href}
        style={S.navLink}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </a>
    </li>
  );
}

export default function NotFound() {
  return (
    <>
      <style>{`
        @keyframes cs-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes cs-scan  { 0%,100%{opacity:.4;transform:scaleX(.6)} 50%{opacity:1;transform:scaleX(1)} }
      `}</style>

      <div style={S.page}>
        <div style={S.glow} />

        <GridCells />

      
        <nav style={S.nav}>
          <a href="/" style={S.logo}>{CONTENT.brand}</a>
        </nav>

     
        <main style={S.body}>

          {/* Status chip */}
          <div style={S.chip}>
            <div style={S.dot} />
            {CONTENT.chip}
          </div>

          {/* 404 number + scan bar */}
          <div>
            <div style={S.errorCode}>
              <span>{CONTENT.headline[0]}</span>
              <span style={{ color: THEME.green }}>{CONTENT.headline[1]}</span>
              <span>{CONTENT.headline[2]}</span>
            </div>
            <div style={S.scanBar} />
          </div>

          <h1 style={S.title}>{CONTENT.title}</h1>

          <p style={S.description}>
            {CONTENT.description[0]}
            <code style={S.code}>{CONTENT.description[1]}</code>
            {CONTENT.description[2]}
            {"\n"}
            {CONTENT.description[3]}
          </p>

          <div style={S.btnRow}>
            <Btn href={CONTENT.primaryCta.href} primary>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
                <path d="M9 21V12h6v9"/>
              </svg>
              {CONTENT.primaryCta.label}
            </Btn>

            <Btn href={CONTENT.secondaryCta.href} onClick={(e) => { e.preventDefault(); window.history.back(); }}>
              
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              {CONTENT.secondaryCta.label}
            </Btn>
          </div>

        </main>

        <div style={S.cornerMeta}>
          {CONTENT.cornerMeta.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>

      </div>
    </>
  );
}