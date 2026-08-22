import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import worldMap from "../assets/worldMap.png";
import welcomeOwasp from "../assets/welcomeOwasp.png";
import img1 from "../assets/img1.svg";
import img2 from "../assets/img2.svg";
import img3 from "../assets/img3.svg";
import img4 from "../assets/img4.svg";
import img5 from "../assets/img5.svg";
import csLogo from "../assets/cs-logo.jpg";
import authIMG1 from "../assets/authIMG1.svg";
import authIMG2 from "../assets/authIMG2.svg";
import { authAPI } from "../utils/api";
import { consumeAuthNotice } from "../utils/authRedirect";

const SITE_CONFIG = {
  name: "Cybershare",
  tagline: "Know Before They Do",
  logoMark: "CS",
  navLinks: ["Specially", "Designed", "For", "Your Security"],
  ctaText: "Start Scanning",
};

const HERO_CONTENT = {
  pill1: "Automated Scanning",
  pill2: "Actionable Reports",
  headline: ["Identify security", "weaknesses", "before attackers do."],
  accentWord: "weaknesses",
  subtext:
    "Automated website vulnerability scanning and cybersecurity community designed to help developers identify common security weaknesses and improve their security posture through clear remediation guidance.",
  ctaLabel: "Start Scanning",
};

const ABOUT_STATS = [
  {
    value: "OWASP",
    label: "Top 10 Vulnerabilities",
    source: "Security Standard",
  },
  {
    value: "CWE",
    label: "Catalog Coverage",
    source: "MITRE",
  },
  {
    value: "NIST",
    label: "NVD Database",
    source: "Vulnerability Data",
  },
  {
    value: "CVSS",
    label: "Severity Ratings",
    source: "Scoring System",
  },
];

const ABOUT_DESC =
  "Cybershare provides automated vulnerability scanning to help developers identify common security issues in their web applications. Our platform detects SQL injection, XSS, CSRF, security misconfigurations, and other OWASP Top 10 vulnerabilities with clear, actionable remediation guidance.";

const TESTIMONIAL = {
  tag: "Mission",
  quote:
    "Cybershare helps developers and organizations identify web vulnerabilities through automated scanning, actionable reports, and security best practices.",
  author: "Cybershare Team",
  role: "Website Security Platform",
};

const TRUSTED_BY = [
  { name: "OWASP", color: "#ce412b" },
  { name: "CVE Database", color: "#005a9c" },
  { name: "NIST NVD", color: "#3c3b6e" },
  { name: "MITRE ATT&CK", color: "#ff6633" },
  { name: "Security Best Practices", color: "#2563eb" },
];

const TECH_STACK = [
  {
    label: "React",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  {
    label: "Python",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: "AWS",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
  },
  {
    label: "Docker",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    label: "Rust",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "AI/ML",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    ),
  },
  {
    label: "TypeScript",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: "Kubernetes",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    label: "PostgreSQL",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    label: "GraphQL",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    label: "Node.js",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    label: "Redis",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    id: "scan",
    title: "Automated\nScanning",
    body: "Comprehensive vulnerability scanning that detects SQL injection, XSS, CSRF, security misconfigurations, and other OWASP Top 10 vulnerabilities.",
    icons: [
      <img src={img1} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
      <img src={img2} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
      <img src={img3} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
      <img src={img4} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
      <img src={img5} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
    ],
    stat: null,
  },
  {
    id: "reports",
    title: "Actionable\nReports",
    body: "Clear, detailed reports with severity ratings and guiding recommendation.",
    stat: { value: "CVSS", label: "Severity Ratings" },
    showMap: true,
  },
  {
    id: "coverage",
    title: "Comprehensive\nCoverage",
    body: "Detect vulnerabilities across web applications, APIs, and common security misconfigurations with our extensive vulnerability database.",
    stat: { value: "OWASP", label: "Top 10 Coverage" },
    showOrbit: true,
  },
  {
    id: "guidance",
    title: "Remediation\nGuidance",
    body: "Step-by-step remediation instructions with code examples and best practices to help developers understand and fix security issues.",
    icons: [
      <img src={img1} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
      <img src={img2} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
      <img src={img3} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
      <img src={img4} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
      <img src={img5} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
    ],
    badge: "Fast Fixes",
  },
];

const AUTH_CONTENT = {
  floatBadge: "Start your first security assessment",
  headline: "Start your first",
  accentWord: "security assessment.",
  subtext:
    "Create an account and scan your website for common security vulnerabilities in minutes.",
};

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Enter website URL",
    description:
      "Simply input your website URL to begin the vulnerability scanning process.",
  },
  {
    step: "2",
    title: "Cybershare scans the target",
    description:
      "Our automated scanner analyzes your website for common security weaknesses.",
  },
  {
    step: "3",
    title: "Vulnerabilities are detected",
    description:
      "Identify SQL injection, XSS, CSRF, and other OWASP Top 10 vulnerabilities.",
  },
  {
    step: "4",
    title: "Security report is generated",
    description:
      "Receive a detailed report with severity ratings and prioritized findings.",
  },
  {
    step: "5",
    title: "Developer receives useful recommendations",
    description:
      "Get tips to upgrade your website security and the security score",
  },
  {
    step: "6",
    title: "Come again",
    description: "Come back to the website and scan again to see the changes",
  }

];

const COMMUNITY_STATS = [
  { value: "12K+", label: "Security Researchers" },
  { value: "3.4K", label: "Vulnerabilities Shared" },
  { value: "890+", label: "Remediation Guides" },
  { value: "99%", label: "Uptime Reliability" },
];

const THREAT_FEED = [
  {
    severity: "critical",
    tag: "CVE-2025-1337",
    title: "Zero-day in Apache HTTP Server allows RCE via crafted headers",
    time: "2h ago",
    votes: 142,
  },
  {
    severity: "high",
    tag: "SQLi",
    title: "New polymorphic SQL injection bypassing WAF signatures",
    time: "5h ago",
    votes: 89,
  },
  {
    severity: "medium",
    tag: "XSS",
    title: "Stored XSS in popular CMS plugin affects 200K+ sites",
    time: "9h ago",
    votes: 61,
  },
  {
    severity: "high",
    tag: "Supply Chain",
    title: "Malicious npm package mimicking lodash discovered",
    time: "1d ago",
    votes: 204,
  },
];

const RESOURCES = [
  {
    icon: "📖",
    type: "Guide",
    title: "OWASP Top 10 — 2025 Edition",
    desc: "Complete walkthrough with code examples",
  },
  {
    icon: "🎥",
    type: "Video",
    title: "Bypassing CSRF Tokens in Modern SPAs",
    desc: "45-min deep-dive by @sec_researcher",
  },
  {
    icon: "🛠",
    type: "Tool",
    title: "Nuclei Template Pack — Auth Testing",
    desc: "240 community-built detection templates",
  },
  {
    icon: "📝",
    type: "Write-up",
    title: "How I Found a $20K Bug in a Fortune 500",
    desc: "Full bug bounty disclosure timeline",
  },
];

const LEADERBOARD = [
  {
    rank: 1,
    handle: "0xRaven",
    points: 9820,
    badge: "Elite Hunter",
    color: "#f59e0b",
  },
  {
    rank: 2,
    handle: "nullptr_",
    points: 7410,
    badge: "Exploit Dev",
    color: "#a78bfa",
  },
  {
    rank: 3,
    handle: "sec_phantom",
    points: 6230,
    badge: "CVE Author",
    color: "#34d399",
  },
  {
    rank: 4,
    handle: "h4ckl1ght",
    points: 4980,
    badge: "OWASP Expert",
    color: "#60a5fa",
  },
  {
    rank: 5,
    handle: "buffer_over",
    points: 3750,
    badge: "Contributor",
    color: "#f87171",
  },
];

function Starfield() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let stars = [],
      raf;
    const resize = () => {
      c.width = c.parentElement.offsetWidth;
      c.height = c.parentElement.offsetHeight;
      const n = Math.floor((c.width * c.height) / 3800);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: Math.random() * 1.1 + 0.2,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.004,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of stars) {
        s.a += s.da;
        if (s.a <= 0 || s.a >= 1) s.da *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", resize);
    resize();
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      id="starfield"
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    />
  );
}

function Marquee({ items, dark = false, speed = 28 }) {
  const doubled = [...items, ...items];
  return (
    <div className={`marquee-outer ${dark ? "marquee-dark" : ""}`}>
      <div className="marquee-track" style={{ animationDuration: `${speed}s` }}>
        {doubled.map((item, i) => (
          <div className="tech-chip" key={i}>
            <span className="tech-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Small-screen "See more / See less" mobile bar + icons
   ------------------------------------------------------------
   These are intentionally self-contained (no new deps) so they
   match the inline-SVG style already used throughout this file.
   ============================================================ */

function ChevronIcon({ expanded }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: "transform .25s ease",
        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        flexShrink: 0,
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/* CSS for the mobile-only behaviour. Scoped entirely under
   max-width: 767px (Tailwind's `md` breakpoint used elsewhere in
   this file) so medium/large screens are never touched.

   NOTE: the light-mode color overrides below target the custom
   classNames already used in this file (.hero-sub, .auth-card,
   .ai, .a-btn, .pill, etc). They're written defensively with
   !important since the real values of those classes live in an
   external stylesheet this component doesn't control — tweak the
   hex values here if they don't quite match your palette. */
const MOBILE_TOGGLE_STYLES = `
  .mobile-toggle-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0;
    padding: 14px 20px;
    background: #0a0a0c;
    border-top: 1px solid #232326;
    border-bottom: 1px solid #232326;
    transition: background .25s ease, box-shadow .25s ease, border-color .25s ease;
  }
  .mobile-toggle-bar.is-sticky {
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 10px 24px rgba(0, 0, 0, .35);
  }
  .mobile-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #f2f2f2;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: .02em;
    font-family: inherit;
    padding: 6px 2px;
    width: 50%;
  }
  .mobile-theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 50%;
    height: auto;
    border-radius: 8px;
    border: 1px solid #2a2a2e;
    background: #141416;
    color: #f5c451;
    cursor: pointer;
    transition: background .2s ease, border-color .2s ease, color .2s ease;
    padding: 8px;
    font-size: 13px;
    font-weight: 600;
  }
  .mobile-theme-toggle:hover {
    border-color: #f5c451;
  }

  @media (min-width: 768px) {
    .mobile-toggle-bar {
      display: none !important;
    }
  }

  @media (max-width: 767px) {
    /* Hide middle sections completely on mobile when collapsed */
    #p-features.hidden-mobile,
    #p-how-it-works.hidden-mobile {
      display: none !important;
    }

    /* Bar itself, in light mode */
    .scroll-root.mobile-light .mobile-toggle-bar {
      background: #f7f7f9 !important;
      border-color: #e5e5ea !important;
    }
    .scroll-root.mobile-light .mobile-toggle-btn {
      color: #14151a !important;
    }
    .scroll-root.mobile-light .mobile-theme-toggle {
      background: #ffffff !important;
      border-color: #dcdce2 !important;
      color: #b8860b !important;
    }

    /* Hero + auth panels, in light mode (the "closed" mobile view) */
    .scroll-root.mobile-light #p-hero {
      background-image: none !important;
      background-color: #ffffff !important;
    }
    .scroll-root.mobile-light #p-hero #starfield,
    .scroll-root.mobile-light #p-hero .glow,
    .scroll-root.mobile-light #p-hero .grid-ov {
      display: none !important;
    }
    .scroll-root.mobile-light #p-auth {
      background-color: #ffffff !important;
    }

    .scroll-root.mobile-light #p-hero nav a.logo {
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-hero .nav-links a {
      color: #4b4b55 !important;
    }
    .scroll-root.mobile-light #p-hero .hero-pills .pill {
      background: rgba(20, 21, 26, .06) !important;
      border: 1px solid rgba(20, 21, 26, .14) !important;
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-hero .hero-h1,
    .scroll-root.mobile-light #p-hero .hero-h1 span {
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-hero .hero-sub {
      color: #4b4b55 !important;
    }

    .scroll-root.mobile-light #p-auth .auth-float {
      background: #ffffff !important;
      border: 1px solid #e5e5ea !important;
      color: #14151a !important;
      box-shadow: 0 6px 18px rgba(0, 0, 0, .06) !important;
    }
    .scroll-root.mobile-light #p-auth .auth-hd h2 {
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-auth .auth-hd p {
      color: #4b4b55 !important;
    }
    .scroll-root.mobile-light #p-auth .auth-tabs {
      background: #f2f2f5 !important;
      border: 1px solid #e5e5ea !important;
    }
    .scroll-root.mobile-light #p-auth .auth-tabs .at {
      color: #6b6b76 !important;
    }
    .scroll-root.mobile-light #p-auth .auth-tabs .at.active {
      background: #ffffff !important;
      color: #14151a !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, .08) !important;
    }
    .scroll-root.mobile-light #p-auth .auth-card {
      background: #ffffff !important;
      border: 1px solid #e5e5ea !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .06) !important;
    }
    .scroll-root.mobile-light #p-auth .ai {
      background: #f7f7f9 !important;
      border: 1px solid #dcdce2 !important;
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-auth .ai::placeholder {
      color: #9a9aa5 !important;
    }
    .scroll-root.mobile-light #p-auth .a-btn.ghost {
      background: #ffffff !important;
      border: 1px solid #dcdce2 !important;
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-auth .a-divider {
      color: #9a9aa5 !important;
    }
    .scroll-root.mobile-light #p-auth .a-link {
      color: #4b4b55 !important;
    }
    .scroll-root.mobile-light #p-auth .a-link a {
      color: #b8860b !important;
    }
    .scroll-root.mobile-light #p-auth .pv {
      background: #f7f7f9 !important;
      border: 1px solid #e5e5ea !important;
    }
    .scroll-root.mobile-light #p-auth .preview-stack .pv img {
      filter: invert(1) !important;
    }

    /* Features section, in light mode */
    .scroll-root.mobile-light #p-features {
      background-color: #ffffff !important;
    }
    .scroll-root.mobile-light #p-features .sec-head {
      background: #ffffff !important;
    }
    .scroll-root.mobile-light #p-features .sec-head h2 {
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-features .sec-head p {
      color: #4b4b55 !important;
    }
    .scroll-root.mobile-light #p-features .fc {
      background: #ffffff !important;
      border: 1px solid #e5e5ea !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, .06) !important;
    }
    .scroll-root.mobile-light #p-features .fc h3 {
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-features .fc p {
      color: #4b4b55 !important;
    }
    .scroll-root.mobile-light #p-features .big-stat {
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-features .big-stat small {
      color: #6b6b76 !important;
    }
    .scroll-root.mobile-light #p-features .bdg {
      background: rgba(184, 134, 11, .1) !important;
      color: #b8860b !important;
      border: 1px solid rgba(184, 134, 11, .2) !important;
    }
    .scroll-root.mobile-light #p-features .pv {
      background: #f7f7f9 !important;
      border: 1px solid #e5e5ea !important;
    }
    .scroll-root.mobile-light #p-features .ic img {
      filter: invert(1) !important;
    }
    .scroll-root.mobile-light #p-features .preview-stack .pv img {
      filter: invert(1) !important;
    }

    /* How it works section, in light mode */
    .scroll-root.mobile-light #p-how-it-works {
      background-color: #ffffff !important;
    }
    .scroll-root.mobile-light #p-how-it-works .sec-head {
      background: #ffffff !important;
    }
    .scroll-root.mobile-light #p-how-it-works .sec-head h2 {
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-how-it-works .dc {
      background: #ffffff !important;
      border: 1px solid #e5e5ea !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, .06) !important;
    }
    .scroll-root.mobile-light #p-how-it-works .dc-lbl {
      color: #b8860b !important;
    }
    .scroll-root.mobile-light #p-how-it-works .dc-val {
      color: #14151a !important;
    }
    .scroll-root.mobile-light #p-how-it-works .dc-sub {
      color: #4b4b55 !important;
    }
  }
`;

export default function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add("welcome-page");

    return () => {
      document.body.classList.remove("welcome-page");
    };
  }, []);
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [authNotice, setAuthNotice] = useState("");
  const noticeTimerRef = useRef(null);

  // ---- Mobile-only "See more / See less" state ----
  // mobileExpanded: whether the middle sections (features + how-it-works)
  // are revealed on small screens. Desktop/tablet ignore this entirely.
  // mobileTheme: light/dark for the collapsed ("closed") mobile view only.
  // Defaults to "dark" so the small-screen page looks exactly like the
  // existing design until the user opts into light mode.
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [mobileTheme, setMobileTheme] = useState("dark");
  const featuresRef = useRef(null);

  const isMobileLightMode = mobileTheme === "light";
  const middleSectionVisibilityClass = mobileExpanded
    ? ""
    : "hidden-mobile";
  const toggleBarStickyClass = mobileExpanded ? "is-sticky" : "";

  const handleToggleExpand = () => {
    setMobileExpanded((prev) => {
      const next = !prev;
      if (next) {
        // Reveal the newly-shown content on the next paint.
        requestAnimationFrame(() => {
          featuresRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
      return next;
    });
  };

  useEffect(() => {
    const notice = consumeAuthNotice();
    if (!notice) return;

    setActiveTab("register");
    setAuthNotice(notice);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setAuthNotice("");
    }, 3000);

    return () => clearTimeout(noticeTimerRef.current);
  }, [location.key]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authAPI.login(loginForm.email, loginForm.password);
      navigate("/main");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authAPI.register(
        registerForm.username,
        registerForm.email
      );

      // Successfully registered and logged in by backend
      window.location.href = "/main?complete_profile=true";
    } catch (err) {
      // Handle validation errors with details
      if (err.details && Array.isArray(err.details)) {
        const passwordErrors = err.details.filter(
          (d) => d.path[0] === "password",
        );
        const emailErrors = err.details.filter((d) => d.path[0] === "email");
        const usernameErrors = err.details.filter(
          (d) => d.path[0] === "username",
        );

        if (passwordErrors.length > 0) {
          setError(
            "Password does not meet requirements. Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.",
          );
        } else if (emailErrors.length > 0) {
          setError("Please enter a valid email address.");
        } else if (usernameErrors.length > 0) {
          setError(
            "Username must be at least 3 characters and can only contain letters, numbers, and underscores.",
          );
        } else {
          const errorMessages = err.details.map((d) => d.message).join(", ");
          setError(errorMessages);
        }
      } else {
        setError(err.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{MOBILE_TOGGLE_STYLES}</style>

      {authNotice && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bg-[#111] border border-[#2a2a2a] rounded-lg text-[12px] font-mono text-[#ccc] whitespace-nowrap z-[300] transition-all duration-200"
          style={{
            top: "20px",
            paddingLeft: "20px",
            paddingRight: "20px",
            paddingTop: "10px",
            paddingBottom: "10px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          }}
        >
          {authNotice}
        </div>
      )}
      <div
        className={`scroll-root ${isMobileLightMode ? "mobile-light" : ""}`}
      >
        <section
          className="panel"
          id="p-hero"
          style={{
            backgroundImage: `url(${mainBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Starfield />
          <div className="glow" />
          <div className="grid-ov" />

          <nav>
            <a href="#" className="logo">
              <img src={csLogo} alt="Cybershare Logo" className="logo-mark" style={{ width: "45px", height: "45px" }} />
              {SITE_CONFIG.name}
            </a>
            <ul className="nav-links">
              {SITE_CONFIG.navLinks.map((l) => (
                <li key={l}>
                  <a href="#">{l}</a>
                </li>
              ))}
            </ul>
            <a href="#p-auth">
              <button className="nav-btn">
                <div className="nav-btn-dot" />
                {SITE_CONFIG.ctaText}
              </button>
            </a>
          </nav>

          <div className="hero-body">
            <div>
              <div className="hero-pills">
                <span className="pill anim-right d100">
                  {HERO_CONTENT.pill1}
                </span>
                <span className="pill anim-right d200">
                  {HERO_CONTENT.pill2}
                </span>
              </div>
              <h1 className="hero-h1">
                <span className="anim-up d200" style={{ display: "block" }}>
                  {HERO_CONTENT.headline[0]}
                </span>
                <em
                  className="anim-up d350"
                  style={{ display: "block", animationDelay: ".35s" }}
                >
                  {HERO_CONTENT.headline[1]}
                </em>
                <span
                  className="anim-up"
                  style={{
                    display: "block",
                    animationDelay: ".5s",
                    opacity: 0,
                  }}
                >
                  {HERO_CONTENT.headline[2]}
                </span>
              </h1>
            </div>

            <div className="hero-right">
              <p className="hero-sub anim-left d300">{HERO_CONTENT.subtext}</p>
              <button className="hero-cta anim-scale d500">
                {HERO_CONTENT.ctaLabel}
              </button>
            </div>
          </div>
        </section>


        <div className={`mobile-toggle-bar md:hidden ${toggleBarStickyClass}`}>
          <button
            type="button"
            className="mobile-toggle-btn"
            onClick={handleToggleExpand}
            aria-expanded={mobileExpanded}
          >
            <span>{mobileExpanded ? "See less" : "See more"}</span>
            <ChevronIcon expanded={mobileExpanded} />
          </button>

          <button
            type="button"
            className="mobile-theme-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setMobileTheme((t) => (t === "dark" ? "light" : "dark"));
            }}
            aria-label={
              mobileTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={mobileTheme === "dark" ? "Light mode" : "Dark mode"}
          >
            {mobileTheme === "dark" ? <SunIcon /> : <MoonIcon />}
            <span>{mobileTheme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>

        <section
          ref={featuresRef}
          className={`panel bg-black/95 ${middleSectionVisibilityClass}`}
          id="p-features"
        >
          <div className="feat-wrap flex items-center">
            <div className="sec-head bg-black md:w-[50%]">
              <h2 className="anim-up">Features &amp; Benefits</h2>
              <p className="anim-up d200">
                Everything you need to stay ahead of attackers — built for teams
                of all sizes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 dash-grid">
              <div className="md:max-h-[60%] fc anim-up d100 md:mt-20">
                <div className="icon-row">
                  {FEATURES[0].icons.map((ic, i) => (
                    <div className="ic" key={i}>
                      {ic}
                    </div>
                  ))}
                </div>
                <h3>{FEATURES[0].title}</h3>
                <p>{FEATURES[0].body}</p>
              </div>

              <div
                className="md:max-h-[60%] fc md:fc-owasp anim-up d200"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <h3>{FEATURES[1].title}</h3>
                <p>{FEATURES[1].body}</p>
                <div
                  className="big-stat"
                  style={{ marginTop: "auto", position: "relative", zIndex: 1 }}
                >
                  {FEATURES[1].stat.value}
                  <small>{FEATURES[1].stat.label}</small>
                </div>
                <div
                  className="world-map-bg"
                  style={{
                    backgroundImage: `url(${worldMap})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "150px",
                    height: "100px",
                    borderRadius: "12px",
                    opacity: 0.3,
                    zIndex: 0,
                  }}
                ></div>
              </div>

              <div
                className="md:max-h-[60%] fc md:fc-owasp anim-up d300 md:mt-20"
                style={{ position: "relative", overflow: "hidden"}}
              >
                <h3>{FEATURES[2].title}</h3>
                <p>{FEATURES[2].body}</p>
                <div
                  className="big-stat"
                  style={{ marginTop: "auto", position: "relative", zIndex: 1 }}
                >
                  {FEATURES[2]?.stat?.value}
                  <small>{FEATURES[2]?.stat.label}</small>
                </div>
              </div>
            </div>

            <div className="preview-stack anim-up d500" style={{ marginTop: "-50px" }}>
              <div className="pv" style={{ backgroundColor: "black" }}>
                <img src={authIMG1} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div className="pv" style={{ backgroundColor: "black" }}>
                <img src={csLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div className="pv">
                <img src={authIMG2} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>
          </div>
        </section>

        <section
          className={`panel min-h-[100vh] pb-3 bg-black/95 ${middleSectionVisibilityClass}`}
          id="p-how-it-works"
        >
         <div className="sec-head bg-black threats-wrap flex items-center">
            <div className="sec-head bg-black md:w-[50%]">
              <div className="rounded-lg p-4">
                <h2 className="anim-up">How it works</h2>
              </div>
            </div>
            <div className="flex grid-cols-1 gap-4 dash-grid">
              {HOW_IT_WORKS.map((step, i) => (
                <div
                  className="dc anim-scale"
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                  key={i}
                >
                  <div
                    className="dc-lbl"
                    style={{
                      fontSize: "32px",
                      fontWeight: 900,
                      color: "var(--amber)",
                    }}
                  >
                    {step.step}
                  </div>
                  <h3
                    className="dc-val"
                    style={{ fontSize: "16px", marginTop: "12px" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="dc-sub"
                    style={{ fontSize: "12px", lineHeight: 1.6 }}
                  >
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel" id="p-auth">
          <div className="auth-wrap">
            <div className="auth-float anim-left">
              <span className="auth-star">★</span> {AUTH_CONTENT.floatBadge}
            </div>

            <div className="auth-hd anim-up">
              <h2>
                {AUTH_CONTENT.headline}{" "}
                <a className="md:text-yellow-500 lg:text-black">{AUTH_CONTENT.accentWord}</a>
              </h2>
              <p>{AUTH_CONTENT.subtext}</p>
            </div>

            <div className="auth-tabs anim-scale d200">
              <button
                className={`at ${activeTab === "login" ? "active" : ""}`}
                onClick={() => setActiveTab("login")}
              >
                Log In
              </button>
              <button
                className={`at ${activeTab === "register" ? "active" : ""}`}
                onClick={() => setActiveTab("register")}
              >
                Register
              </button>
            </div>

            {activeTab === "login" ? (
              <div className="auth-card anim-up d300">
                <form className="af" onSubmit={handleLogin}>
                  {error && (
                    <div className="text-red-500 text-sm mb-4">{error}</div>
                  )}
                  <input
                    className="ai"
                    type="email"
                    placeholder="Email address"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    required
                  />
                  <div className="relative">
                    <input
                      className="ai"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.418 0 8 3.582 8 8 0 .354-.022.704-.064 1.051m-2.288 2.716A7.948 7.948 0 0 1 12 20c-4.418 0-8-3.582-8-8 0-.354.022-.704.064-1.051" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    className="a-btn primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Log In →"}
                  </button>
                  <div className="a-divider">or continue with</div>
                  <button
                    className="a-btn ghost flex items-center justify-center gap-2"
                    type="button"
                    onClick={() =>
                      (window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`)
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="main-grid-item-icon"
                      fill="none"
                    >
                      <path
                        d="M24 12.276c0-.816-.067-1.636-.211-2.438H12.242v4.62h6.612a5.549 5.549 0 0 1-2.447 3.647v2.998h3.945C22.669 19.013 24 15.927 24 12.276Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12.241 24c3.302 0 6.086-1.063 8.115-2.897l-3.945-2.998c-1.097.732-2.514 1.146-4.165 1.146-3.194 0-5.902-2.112-6.873-4.951H1.302v3.09C3.38 21.444 7.612 24 12.242 24Z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.369 14.3a7.053 7.053 0 0 1 0-4.595v-3.09H1.302a11.798 11.798 0 0 0 0 10.776L5.369 14.3Z"
                        fill="#FBBC04"
                      />
                      <path
                        d="M12.241 4.75a6.727 6.727 0 0 1 4.696 1.798l3.495-3.425A11.898 11.898 0 0 0 12.243 0C7.611 0 3.38 2.558 1.301 6.615l4.067 3.09C6.336 6.862 9.048 4.75 12.24 4.75Z"
                        fill="#EA4335"
                      />
                    </svg>
                    <p>&nbsp;Continue with Google</p>
                  </button>
                  <p className="a-link">
                    No account?{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("register");
                      }}
                    >
                      Register free
                    </a>
                  </p>
                </form>
              </div>
            ) : (
              <div className="auth-card anim-scale">
                <form className="af" onSubmit={handleRegister}>
                  {error && (
                    <div className="text-red-500 text-sm mb-4">{error}</div>
                  )}
                  <input
                    className="ai"
                    type="text"
                    placeholder="Username"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        username: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    className="ai"
                    type="email"
                    placeholder="Work email"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        email: e.target.value,
                      })
                    }
                    required
                  />

                  <button
                    className="a-btn primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account →"}
                  </button>
                  <div className="a-divider">or</div>
                  <button
                    className="a-btn ghost flex items-center justify-center gap-2"
                    type="button"
                    onClick={() =>
                      (window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`)
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="main-grid-item-icon"
                      fill="none"
                    >
                      <path
                        d="M24 12.276c0-.816-.067-1.636-.211-2.438H12.242v4.62h6.612a5.549 5.549 0 0 1-2.447 3.647v2.998h3.945C22.669 19.013 24 15.927 24 12.276Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12.241 24c3.302 0 6.086-1.063 8.115-2.897l-3.945-2.998c-1.097.732-2.514 1.146-4.165 1.146-3.194 0-5.902-2.112-6.873-4.951H1.302v3.09C3.38 21.444 7.612 24 12.242 24Z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.369 14.3a7.053 7.053 0 0 1 0-4.595v-3.09H1.302a11.798 11.798 0 0 0 0 10.776L5.369 14.3Z"
                        fill="#FBBC04"
                      />
                      <path
                        d="M12.241 4.75a6.727 6.727 0 0 1 4.696 1.798l3.495-3.425A11.898 11.898 0 0 0 12.243 0C7.611 0 3.38 2.558 1.301 6.615l4.067 3.09C6.336 6.862 9.048 4.75 12.24 4.75Z"
                        fill="#EA4335"
                      />
                    </svg>
                    <p>&nbsp;Continue with Google</p>
                  </button>
                  <p className="a-link">
                    Already have an account?{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("login");
                      }}
                    >
                      Log in
                    </a>
                  </p>
                </form>
              </div>
            )}

            <div className="preview-stack anim-up d500">
              <div className="pv">
                <img src={authIMG1} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div className="pv">
                <img src={csLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div className="pv">
                <img src={authIMG2} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
