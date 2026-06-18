import { useState, useEffect, useRef } from "react";
import mainBg from "../assets/mainBg.png";

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
    "Automated website vulnerability scanning designed to help developers identify common security weaknesses and improve their security posture through clear remediation guidance.",
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
  { label: "React" },
  { label: "Python" },
  { label: "AWS" },
  { label: "Docker" },
  { label: "Rust" },
  { label: "AI/ML" },
  { label: "TypeScript" },
  { label: "Kubernetes" },
  { label: "PostgreSQL" },
  { label: "GraphQL" },
  { label: "Node.js" },
  { label: "Redis" },
];


const FEATURES = [
  {
    id: "scan",
    title: "Automated\nScanning",
    body: "Comprehensive vulnerability scanning that detects SQL injection, XSS, CSRF, security misconfigurations, and other OWASP Top 10 vulnerabilities.",
    icons: ["IMG", "IMG", "IMG", "IMG", "IMG"],
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
    description: "Simply input your website URL to begin the vulnerability scanning process.",
  },
  {
    step: "2",
    title: "Cybershare scans the target",
    description: "Our automated scanner analyzes your website for common security weaknesses.",
  },
  {
    step: "3",
    title: "Vulnerabilities are detected",
    description: "Identify SQL injection, XSS, CSRF, and other OWASP Top 10 vulnerabilities.",
  },
  {
    step: "4",
    title: "Security report is generated",
    description: "Receive a detailed report with severity ratings and prioritized findings.",
  },
  {
    step: "5",
    title: "Developer receives remediation guidance",
    description: "Get step-by-step instructions with code examples to fix identified issues.",
  },
];

const COMMUNITY_STATS = [
  { value: "12K+", label: "Security Researchers" },
  { value: "3.4K", label: "Vulnerabilities Shared" },
  { value: "890+", label: "Remediation Guides" },
  { value: "99%",  label: "Uptime Reliability" },
];

const THREAT_FEED = [
  { severity: "critical", tag: "CVE-2025-1337", title: "Zero-day in Apache HTTP Server allows RCE via crafted headers", time: "2h ago", votes: 142 },
  { severity: "high",     tag: "SQLi",          title: "New polymorphic SQL injection bypassing WAF signatures",       time: "5h ago", votes: 89  },
  { severity: "medium",   tag: "XSS",           title: "Stored XSS in popular CMS plugin affects 200K+ sites",        time: "9h ago", votes: 61  },
  { severity: "high",     tag: "Supply Chain",  title: "Malicious npm package mimicking lodash discovered",            time: "1d ago", votes: 204 },
];

const RESOURCES = [
  { icon: "📖", type: "Guide",    title: "OWASP Top 10 — 2025 Edition",             desc: "Complete walkthrough with code examples" },
  { icon: "🎥", type: "Video",    title: "Bypassing CSRF Tokens in Modern SPAs",     desc: "45-min deep-dive by @sec_researcher"     },
  { icon: "🛠",  type: "Tool",    title: "Nuclei Template Pack — Auth Testing",      desc: "240 community-built detection templates"  },
  { icon: "📝", type: "Write-up", title: "How I Found a $20K Bug in a Fortune 500", desc: "Full bug bounty disclosure timeline"      },
];

const LEADERBOARD = [
  { rank: 1, handle: "0xRaven",     points: 9820, badge: "Elite Hunter", color: "#f59e0b" },
  { rank: 2, handle: "nullptr_",    points: 7410, badge: "Exploit Dev",  color: "#a78bfa" },
  { rank: 3, handle: "sec_phantom", points: 6230, badge: "CVE Author",   color: "#34d399" },
  { rank: 4, handle: "h4ckl1ght",   points: 4980, badge: "OWASP Expert", color: "#60a5fa" },
  { rank: 5, handle: "buffer_over", points: 3750, badge: "Contributor",  color: "#f87171" },
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
            <span>[IMG]</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Welcome() {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="scroll-root">
      <section className="panel" id="p-hero" style={{ backgroundImage: `url(${mainBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
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
          <button className="nav-btn">
            <div className="nav-btn-dot" />
            {SITE_CONFIG.ctaText}
          </button>
        </nav>

        <div className="hero-body">
          <div>
            <div className="hero-pills">
              <span className="pill anim-right d100">{HERO_CONTENT.pill1}</span>
              <span className="pill anim-right d200">{HERO_CONTENT.pill2}</span>
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
                style={{ display: "block", animationDelay: ".5s", opacity: 0 }}
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

      <section className="panel" id="p-info" style={{ background: 'transparent' }}>
        <div className="info-bar">
          <span className="info-bar-logo anim-right">{SITE_CONFIG.name}</span>
          <span className="info-bar-tag anim-fade d200">
            Trusted by security teams worldwide
          </span>
          <span
            style={{ fontSize: 13, color: "var(--light-sub)" }}
            className="anim-left d300"
          >
            Scan. Detect. Resolve.
          </span>
        </div>

        <div className="marquee-section">
          <Marquee items={TECH_STACK} dark={false} speed={32} />
        </div>

        <div className="info-grid">
          {/* LEFT */}
          <div className="i-col">
            <div className="lc anim-up d100">
              <div className="stats-row">
                {ABOUT_STATS.slice(0, 2).map((s, i) => (
                  <div className="stat-mini" key={i}>
                    <div className="stat-num">{s.value}</div>
                    <div className="stat-lbl">{s.label}</div>
                    <div className="stat-src">{s.source}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lc anim-up d200" style={{ flex: 1 }}>
              <div className="stats-row" style={{ marginBottom: 12 }}>
                {ABOUT_STATS.slice(2, 4).map((s, i) => (
                  <div className="stat-mini" key={i}>
                    <div
                      className="stat-num"
                      style={{ fontSize: "clamp(28px,3vw,44px)" }}
                    >
                      {s.value}
                    </div>
                    <div className="stat-lbl">{s.label}</div>
                    <div className="stat-src">{s.source}</div>
                  </div>
                ))}
              </div>
              <p className="desc-p">{ABOUT_DESC}</p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="i-col">
            <div className="lc anim-left d200">
              <div className="logos-row">
                {TRUSTED_BY.map((b) => (
                  <div className="logo-chip" key={b.name}>
                    <div className="logo-dot" style={{ background: b.color }} />
                    {b.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="lc anim-left d300" style={{ flex: 1 }}>
              <div className="testi-tag">{TESTIMONIAL.tag}</div>
              <p className="testi-q">{TESTIMONIAL.quote}</p>
              <div className="testi-by">
                {TESTIMONIAL.author} <span>{TESTIMONIAL.role}</span>
              </div>
            </div>

            <div className="lc anim-left d400">
              <div className="tech-row">
                <span className="tech-lbl">Stack support</span>
                {TECH_STACK.slice(0, 8).map((t) => (
                  <div className="t-pill" key={t.label} title={t.label}>
                    [IMG]
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel" id="p-features">
        <div className="feat-wrap">
          <div className="sec-head">
            <h2 className="anim-up">Features &amp; Benefits</h2>
            <p className="anim-up d200">
              Everything you need to stay ahead of attackers — built for teams
              of all sizes.
            </p>
          </div>

          <div className="feat-grid">
            <div className="fc anim-up d100">
              <div className="icon-row">
                {FEATURES[0].icons.map((ic, i) => (
                  <div className="ic" key={i}>
                    [IMG]
                  </div>
                ))}
              </div>
              <h3>{FEATURES[0].title}</h3>
              <p>{FEATURES[0].body}</p>
            </div>

            <div className="fc anim-up d200">
              <h3>{FEATURES[1].title}</h3>
              <p>{FEATURES[1].body}</p>
              [IMG - World Map SVG]
              <div className="big-stat" style={{ marginTop: "auto" }}>
                {FEATURES[1].stat.value}
                <small>{FEATURES[1].stat.label}</small>
              </div>
            </div>

            <div className="fc anim-left d300">
              [IMG - Orbit Animation]
              <div className="big-stat">
                {FEATURES[2].stat.value}
                <small>{FEATURES[2].stat.label}</small>
              </div>
              <h3 style={{ fontSize: 18 }}>{FEATURES[2].title}</h3>
              <p>{FEATURES[2].body}</p>
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
                    [IMG]
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel min-h-[100vh]" id="p-how-it-works">
        <div className="threats-wrap">
          <div className="sec-head">
            <div className='bg-black rounded-lg p-4'>
              <h2 className="anim-up">How it works</h2>
              <p className="anim-up d200 text-transparent">Get the scan just in 5 steps</p>
            </div>
          </div>

          <div className="dash-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "1fr" }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div className="dc anim-scale" style={{ animationDelay: `${(i + 1) * 100}ms` }} key={i}>
                <div className="dc-lbl" style={{ fontSize: "32px", fontWeight: 900, color: "var(--amber)" }}>{step.step}</div>
                <h3 className="dc-val" style={{ fontSize: "16px", marginTop: "12px" }}>{step.title}</h3>
                <p className="dc-sub" style={{ fontSize: "12px", lineHeight: 1.6 }}>{step.description}</p>
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
              {AUTH_CONTENT.headline} <strong>{AUTH_CONTENT.accentWord}</strong>
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
              <div className="af">
                <input
                  className="ai"
                  type="email"
                  placeholder="Email address"
                />
                <input className="ai" type="password" placeholder="Password" />
                <button className="a-btn primary">Log In →</button>
                <div className="a-divider">or continue with</div>
                <button className="a-btn ghost">
                  🔑 &nbsp;Continue with Google
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
              </div>
            </div>
          ) : (
            <div className="auth-card anim-scale">
              <div className="af">
                <input className="ai" type="text" placeholder="Full name" />
                <input className="ai" type="email" placeholder="Work email" />
                <input
                  className="ai"
                  type="password"
                  placeholder="Create a password"
                />
                <button className="a-btn primary">Create Account →</button>
                <div className="a-divider">or</div>
                <button className="a-btn ghost">
                  🔑 &nbsp;Continue with Google
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
              </div>
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
  );
}
