import { useState, useEffect, useRef } from "react";

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

const DASHBOARD_DATA = {
  riskScore: {
    value: "Ready",
    change: "System operational",
    positive: true,
  },
  criticalAlerts: { value: "8", label: "Vulnerability types detected" },
  weeklyBars: [
    { day: "SQLi", height: 85, active: true },
    { day: "XSS", height: 70 },
    { day: "CSRF", height: 45 },
    { day: "Headers", height: 60 },
    { day: "SSL", height: 55 },
    { day: "Ports", height: 40 },
    { day: "Auth", height: 35 },
  ],
  sparkline: [20, 35, 25, 40, 30, 45, 50, 35],
  goalScore: { current: 8, target: 10, fill: 80 },
  agents: [
    {
      initials: "CS",
      name: "Cybershare Team",
      email: "team@cybershare.io",
      role: "Security Platform",
      color: "#f59e0b",
    },
  ],
  liveScan: "Enter your website URL to begin scanning",
  calendarMonth: "June 2025",
  scanDays: [3, 6, 12, 16, 25],
  today: 10,
};

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

function MiniCalendar({ month, scanDays, today }) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  const startDay = 0;
  const totalDays = 28;
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push({ empty: true });
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, scan: scanDays.includes(d), today: d === today });
  }
  return (
    <div className="mini-cal">
      {days.map((d, i) => (
        <div key={i} className="mc hd">
          {d}
        </div>
      ))}
      {cells.map((c, i) =>
        c.empty ? (
          <div key={i} className="mc"></div>
        ) : (
          <div
            key={i}
            className={`mc${c.today ? " today" : c.scan ? " scan" : ""}`}
          >
            {c.day}
          </div>
        ),
      )}
    </div>
  );
}

export default function Welcome() {
  const [activeTab, setActiveTab] = useState("login");
  const [goalTarget, setGoalTarget] = useState(30);

  const fillPct = Math.min(
    100,
    Math.max(0, (DASHBOARD_DATA.goalScore.current / 100) * 100),
  );

  return (
    <div className="scroll-root">
      <section className="panel" id="p-hero">
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

      <section className="panel" id="p-info">
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

      <section className="panel" id="p-threats">
        <div className="threats-wrap">
          <div className="sec-head">
            <h2 className="anim-up">Your All-in-One Security Dashboard</h2>
            <p className="anim-up d200">
              Real-time threat intelligence, CVE tracking, and risk scoring —
              all in one place.
            </p>
          </div>

          <div style={{ overflow: "hidden" }}>
            <Marquee items={TECH_STACK} dark={true} speed={20} />
          </div>

          <div className="dash-grid">
            <div className="dc anim-scale d100">
              <span className="dc-lbl">Risk Assessment</span>
              <span className="dc-val" style={{ color: "var(--green)" }}>
                {DASHBOARD_DATA.riskScore.value}
              </span>
              <span className="dc-sub" style={{ color: "var(--green)" }}>
                ↑ {DASHBOARD_DATA.riskScore.change}
              </span>
              <div className="spark">
                {DASHBOARD_DATA.sparkline.map((h, i) => (
                  <div
                    key={i}
                    className={`sb ${h >= 70 ? "a" : ""}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Card: Critical alerts + bars */}
            <div className="dc anim-scale d200">
              <span className="dc-lbl">Critical Alerts</span>
              <span className="dc-val">
                {DASHBOARD_DATA.criticalAlerts.value}
              </span>
              <span className="dc-sub">
                {DASHBOARD_DATA.criticalAlerts.label}
              </span>
              <div className="bars">
                {DASHBOARD_DATA.weeklyBars.map((b) => (
                  <div className="bar-g" key={b.day}>
                    <div
                      className={`bar-f ${b.active ? "act" : ""}`}
                      style={{ height: b.height + "px" }}
                    />
                    <span className="bar-lbl">{b.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="dc dc-wide anim-scale d300">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <span className="dc-lbl">
                  Scan Calendar — {DASHBOARD_DATA.calendarMonth}
                </span>
                <div className="badge-row">
                  <span className="bdg crit">⚠ Critical</span>
                  <span className="bdg high">● High</span>
                  <span className="bdg ok">✓ Resolved</span>
                </div>
              </div>
              <MiniCalendar
                month={DASHBOARD_DATA.calendarMonth}
                scanDays={DASHBOARD_DATA.scanDays}
                today={DASHBOARD_DATA.today}
              />
            </div>

            <div className="dc anim-scale d400">
              <span className="dc-lbl">Risk Score Goal</span>
              <div className="goal-num">{DASHBOARD_DATA.goalScore.current}</div>
              <div className="goal-lbl">Current score (lower = safer)</div>
              <div className="goal-track">
                <div className="goal-fill" style={{ width: `${fillPct}%` }} />
              </div>
              <div className="goal-ctrls">
                <button
                  className="gctrl"
                  onClick={() => setGoalTarget((t) => Math.max(10, t - 5))}
                >
                  −
                </button>
                Target: {goalTarget}
                <button
                  className="gctrl"
                  onClick={() => setGoalTarget((t) => Math.min(90, t + 5))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="dc anim-scale d500">
              <span className="dc-lbl">Scan Agents</span>
              <div className="team-list">
                {DASHBOARD_DATA.agents.map((a) => (
                  <div className="tm" key={a.email}>
                    <div className="av" style={{ background: a.color }}>
                      {a.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="tm-n">{a.name}</div>
                      <div className="tm-e">{a.email}</div>
                    </div>
                    <span className="tm-r">{a.role}</span>
                  </div>
                ))}
              </div>
              <div className="chat-bub">💬 {DASHBOARD_DATA.liveScan}</div>
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
