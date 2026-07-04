import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import worldMap from "../assets/worldMap.png";
import welcomeOwasp from "../assets/welcomeOwasp.png";
import { authAPI } from "../utils/api";
import { consumeAuthNotice } from "../utils/authRedirect";

const SITE_CONFIG = {
  name: "Cybershare",
  tagline: "Know Before They Do",
  logoMark: "CS",
  navLinks: ["Features", "How It Works", "Vulnerabilities", "Reports", "About"],
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
      </svg>,
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
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>,
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
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>,
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
      </svg>,
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
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>,
    ],
    stat: null,
  },
  {
    id: "reports",
    title: "Actionable\nReports",
    body: "Clear, detailed reports with severity ratings, remediation steps, and code examples to help developers fix vulnerabilities quickly.",
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
    icons: ["IMG", "IMG", "IMG", "IMG", "IMG"],
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
    title: "Developer receives remediation guidance",
    description:
      "Get step-by-step instructions with code examples to fix identified issues.",
  },
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
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const noticeTimerRef = useRef(null);

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
        registerForm.email,
        registerForm.password,
      );
      // Auto-login after registration
      await authAPI.login(registerForm.email, registerForm.password);
      navigate("/main");
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
      <div className="scroll-root">
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
              <div className="logo-mark">{SITE_CONFIG.logoMark}</div>
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

        <section className="panel bg-black/70" id="p-features">
          <div className="feat-wrap flex items-center">
            <div className="sec-head bg-black md:w-[50%]">
              <h2 className="anim-up">Features &amp; Benefits</h2>
              <p className="anim-up d200">
                Everything you need to stay ahead of attackers — built for teams
                of all sizes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 dash-grid">
              <div className="fc anim-up d100">
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
                className="fc md:fc-owasp anim-up d200"
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
                className="fc md:fc-owasp anim-up d300"
                style={{ position: "relative", overflow: "hidden" }}
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

              <div className="fc anim-right d400">
                <span className="bdg crit" style={{ alignSelf: "flex-start" }}>
                  {FEATURES[3].badge}
                </span>
                <h3>{FEATURES[3].title}</h3>
                <p>{FEATURES[3].body}</p>
                <div className="icon-row" style={{ marginTop: "auto" }}>
                  {FEATURES[3].icons.map((ic, i) => (
                    <div className="ic" key={i}>
                      {ic}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="panel min-h-[100vh] bg-black/40"
          id="p-how-it-works"
        >
          <div className="threats-wrap flex items-center">
            <div className="sec-head w-full md:w-[50%]">
              <div className="bg-black rounded-lg p-4">
                <h2 className="anim-up">How it works</h2>
                <p className="anim-up d200 text-transparent">
                  Get the scan just in 5 steps
                </p>
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
                <strong>{AUTH_CONTENT.accentWord}</strong>
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
                  <div className="relative">
                    <input
                      className="ai"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm({
                          ...registerForm,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowRegisterPassword(!showRegisterPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showRegisterPassword ? (
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
                <div className="pv-line" style={{ width: "65%" }} />
                <div className="pv-line a" style={{ width: "40%" }} />
                <div className="pv-line" style={{ width: "80%" }} />
                <div className="pv-line" style={{ width: "50%" }} />
                <div className="pv-line a" style={{ width: "30%" }} />
              </div>
              <div className="pv">
                <div className="pv-line a" style={{ width: "75%" }} />
                <div className="pv-line" style={{ width: "55%" }} />
                <div className="pv-line" style={{ width: "90%" }} />
                <div className="pv-line a" style={{ width: "60%" }} />
                <div className="pv-line" style={{ width: "45%" }} />
              </div>
              <div className="pv">
                <div className="pv-line" style={{ width: "55%" }} />
                <div className="pv-line" style={{ width: "75%" }} />
                <div className="pv-line a" style={{ width: "38%" }} />
                <div className="pv-line" style={{ width: "68%" }} />
                <div className="pv-line a" style={{ width: "28%" }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
