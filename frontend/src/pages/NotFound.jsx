import { useEffect, useRef } from "react";
import mainBg from "../assets/mainBg.png";
import "./NotFound.css";

const THEME = {
  green: "#4ade80",
  greenHover: "#6ee79a",
  greenFaint: "rgba(74,222,128,0.10)",
  greenBorder: "rgba(74,222,128,0.25)",
  greenCell: "rgba(74,222,128,0.05)",
  greenCellBorder: "rgba(74,222,128,0.12)",
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


function Btn({ href, onClick, primary, children, className }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={primary ? "notfound-btn" : "notfound-btn-secondary"}
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

  return <div ref={ref} className="notfound-cells" />;
}


export default function NotFound() {
  return (
    <div className="notfound-page" style={{ backgroundImage: `url(${mainBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="notfound-glow" />

      <GridCells />

      <nav className="notfound-nav">
        <a href="/" className="notfound-logo">{CONTENT.brand}</a>
      </nav>

      <main className="notfound-body">
        {/* Status chip */}
        <div className="notfound-chip">
          <div className="notfound-dot" />
          {CONTENT.chip}
        </div>

        {/* 404 number + scan bar */}
        <div>
          <div className="notfound-error-code">
            <span>{CONTENT.headline[0]}</span>
            <span style={{ color: THEME.green }}>{CONTENT.headline[1]}</span>
            <span>{CONTENT.headline[2]}</span>
          </div>
          <div className="notfound-scan-bar" />
        </div>

        <h1 className="notfound-title">{CONTENT.title}</h1>

        <p className="notfound-description">
          {CONTENT.description[0]}
          <code className="notfound-code">{CONTENT.description[1]}</code>
          {CONTENT.description[2]}
          {"\n"}
          {CONTENT.description[3]}
        </p>

        <div className="notfound-btn-row">
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

      <div className="notfound-corner-meta">
        {CONTENT.cornerMeta.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}