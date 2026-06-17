import { useState, useEffect, useRef } from "react";

const SITE_CONFIG = {
  name: "VulnScan",
  tagline: "Know Before They Do",
  logoMark: "VS",
  navLinks: ["Scans", "Reports", "Resources", "Pricing", "Docs"],
  ctaText: "Start Free Scan",
};

const HERO_CONTENT = {
  pill1: "Cybershare Pro",
  pill2: "Real-time Detection",
  headline: ["Detect every", "vulnerability", "before they do."],
  accentWord: "vulnerability",
  subtext:
    "Continuously scan your web apps, APIs, and cloud surfaces for known CVEs, misconfigurations, and exposed secrets. Get actionable remediation reports instantly — no security expertise required.",
  ctaLabel: "Start",
};

const ABOUT_STATS = [
  {
    value: "48k+",
    label: "CVEs published in 2025 — a record high",
    source: "NIST NVD",
  },
  {
    value: "194",
    label: "Average days to identify a breach (IBM 2024)",
    source: "IBM Cost of Breach",
  },
  {
    value: "$4.88M",
    label: "Average cost of a data breach in 2024",
    source: "IBM 2024",
  },
  {
    value: "53%",
    label: "of 2024 CVEs rated High or Critical severity",
    source: "NIST NVD",
  },
];

const ABOUT_DESC =
  "We continuously scan your web applications, APIs, and cloud infrastructure for known CVEs, misconfigurations, exposed secrets, and emerging zero-day exploits. Get prioritized, actionable fix-it reports instantly — ranked by exploitability, not just severity. No security expertise required.";

const TESTIMONIAL = {
  tag: "SecureEdge · Case Study",
  quote:
    "Since deploying Cybershare, our mean time to detect critical vulnerabilities dropped from 14 days to under 2 hours. The automated CVE matching alone saves our team 20+ hours a week — and we finally have confidence in our attack surface.",
  author: "— Yves Tabor",
  role: "Web Developper and Network Engineer",
};

const TRUSTED_BY = [
  { name: "Stripe", color: "#6772e5" },
  { name: "Google", color: "#4285f4" },
  { name: "AWS", color: "#ff9900" },
  { name: "Azure", color: "#0078d4" },
  { name: "Cloudflare", color: "#f38020" },
  { name: "Vercel", color: "#ffffff" },
];

const TECH_STACK = [
  { emoji: "⚛", label: "React" },
  { emoji: "🐍", label: "Python" },
  { emoji: "☁", label: "AWS" },
  { emoji: "🐳", label: "Docker" },
  { emoji: "🦀", label: "Rust" },
  { emoji: "🤖", label: "AI/ML" },
  { emoji: "🔷", label: "TypeScript" },
  { emoji: "☸", label: "Kubernetes" },
  { emoji: "🐘", label: "PostgreSQL" },
  { emoji: "🌐", label: "GraphQL" },
  { emoji: "📦", label: "Node.js" },
  { emoji: "🔴", label: "Redis" },
];

const DASHBOARD_DATA = {
  riskScore: {
    value: "$0 Risk",
    change: "+12% cleaner vs last week",
    positive: true,
  },
  criticalAlerts: { value: "+38", label: "New CVEs detected today" },
  weeklyBars: [
    { day: "Mo", height: 28 },
    { day: "Tu", height: 44 },
    { day: "We", height: 36 },
    { day: "Th", height: 58, active: true },
    { day: "Fr", height: 48 },
    { day: "Sa", height: 32 },
    { day: "Su", height: 20 },
  ],
  sparkline: [30, 55, 45, 72, 60, 85, 100, 78],
  goalScore: { current: 68, target: 30, fill: 68 },
  agents: [
    {
      initials: "YT",
      name: "Sofia Davis",
      email: "Yveswalupakah@gmail.com",
      role: "Owner",
      color: "#f59e0b",
    },
    {
      initials: "JL",
      name: "Jackson Lee",
      email: "jackson0007@gmail.com",
      role: "Member",
      color: "#60a5fa",
    },
    {
      initials: "AR",
      name: "Amara Reyes",
      email: "amaraR2@vulnscan.io",
      role: "Analyst",
      color: "#34d399",
    },
  ],
  liveScan: "Scanning 142.93.41.0/24 — 78% complete…",
  calendarMonth: "June 2025",
  scanDays: [3, 6, 12, 16, 25],
  today: 10,
};

const FEATURES = [
  {
    id: "edge",
    title: "Scanning over\nthe edge",
    body: "Our distributed scan network spans every major cloud region — so your coverage never has a blind spot, no matter where you host.",
    icons: ["▶", "🌐", "✕", "📡", "📋"],
    stat: null,
  },
  {
    id: "global",
    title: "Available in\nevery country",
    body: "Access your dashboard from anywhere in the world. Localized reports in 30+ languages with globally distributed scan nodes.",
    stat: { value: "100+", label: "Countries covered" },
    showMap: true,
  },
  {
    id: "loved",
    title: "People\nlove us",
    body: "See what security teams say about VulnScan's accuracy, speed, and zero false-positive promise.",
    stat: { value: "542k", label: "Total scans run" },
    showOrbit: true,
  },
  {
    id: "alerts",
    title: "Instant alerts.\nZero noise.",
    body: "Webhook-ready notifications via Slack, PagerDuty, Jira, and email. Our ML filter removes false positives so your team acts on what actually matters.",
    icons: ["🔔", "📧", "🔗", "🐛", "📱"],
    badge: "⚡ Real-time",
  },
];

const AUTH_CONTENT = {
  floatBadge: "Free 14-day trial included",
  headline: "Let's build something",
  accentWord: "secure.",
  subtext:
    "You haven't run any scans yet. Create an account or log in — then connect your first target in under 60 seconds.",
};

const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --black: #080808;
  --dark: #0f0f0f;
  --card: #141414;
  --border: #222;
  --amber: #f59e0b;
  --amber2: #fbbf24;
  --red: #ef4444;
  --green: #22c55e;
  --muted: #555;
  --sub: #888;
  --text: #e0e0e0;
  --white: #fff;
  --light-bg: #f4f4f1;
  --light-card: #ffffff;
  --light-border: #e4e4de;
  --light-text: #111;
  --light-sub: #666;
}

body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--black); color: var(--text); overflow-x: hidden; }

.scroll-root { position: relative; height: 500vh; }

.panel {
  position: sticky; top: 0; height: 100vh; width: 100%;
  overflow: hidden; display: flex; flex-direction: column;
}
.panel:nth-child(1) { z-index: 1; }
.panel:nth-child(2) { z-index: 2; }
.panel:nth-child(3) { z-index: 3; }
.panel:nth-child(4) { z-index: 4; }
.panel:nth-child(5) { z-index: 5; }

.panel:nth-child(n+2)::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0;
  height: 24px; background: linear-gradient(to bottom, rgba(0,0,0,.18), transparent);
  z-index: 99; pointer-events: none;
}

@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.marquee-track {
  display: flex; width: max-content; gap: 12px;
  animation: marquee 28s linear infinite;
  will-change: transform;
}
.marquee-track:hover { animation-play-state: paused; }
.marquee-outer { overflow: hidden; width: 100%; }
.tech-chip {
  display: flex; align-items: center; gap: 8px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 10px; padding: 8px 14px; white-space: nowrap;
  font-size: 13px; color: var(--sub); font-weight: 500;
  transition: border-color .2s, color .2s;
  cursor: default;
}
.tech-chip:hover { border-color: var(--amber); color: var(--text); }
.tech-chip span { font-size: 18px; }

@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeSlideUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeSlideLeft { from { opacity:0; transform:translateX(32px); } to { opacity:1; transform:translateX(0); } }
@keyframes fadeSlideRight { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes scaleIn { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
@keyframes typewriter { from { width:0; } to { width:100%; } }
@keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.0)} 50%{box-shadow:0 0 24px 4px rgba(245,158,11,.22)} }

.anim-up { opacity:0; animation: fadeSlideUp .7s ease forwards; }
.anim-left { opacity:0; animation: fadeSlideLeft .7s ease forwards; }
.anim-right { opacity:0; animation: fadeSlideRight .7s ease forwards; }
.anim-fade { opacity:0; animation: fadeIn .8s ease forwards; }
.anim-scale { opacity:0; animation: scaleIn .6s cubic-bezier(.34,1.56,.64,1) forwards; }

.d100 { animation-delay:.1s; }
.d200 { animation-delay:.2s; }
.d300 { animation-delay:.3s; }
.d400 { animation-delay:.4s; }
.d500 { animation-delay:.5s; }
.d600 { animation-delay:.6s; }
.d700 { animation-delay:.7s; }
.d800 { animation-delay:.8s; }

nav { position:relative; z-index:10; display:flex; align-items:center; justify-content:space-between; padding:22px 48px; }
.logo { display:flex; align-items:center; gap:10px; font-weight:800; font-size:17px; color:var(--white); text-decoration:none; letter-spacing:-.03em; }
.logo-mark { width:34px; height:34px; background:var(--white); color:var(--black); border-radius:8px; display:grid; place-items:center; font-weight:900; font-size:13px; }
.nav-links { display:flex; gap:36px; list-style:none; }
.nav-links a { font-size:14px; color:var(--sub); text-decoration:none; transition:color .2s; }
.nav-links a:hover { color:var(--white); }
.nav-btn { background:var(--amber); color:var(--black); font-size:14px; font-weight:700; padding:10px 22px; border-radius:10px; text-decoration:none; display:flex; align-items:center; gap:8px; transition:background .2s, transform .2s; cursor:pointer; border:none; font-family:inherit; }
.nav-btn:hover { background:var(--amber2); transform:translateY(-1px); }
.nav-btn-dot { width:7px; height:7px; background:var(--black); border-radius:50%; animation:blink 2s ease-in-out infinite; }

#p-hero { background:var(--black); }
#starfield { position:absolute; inset:0; z-index:0; }
.glow { position:absolute; bottom:-8%; left:50%; transform:translateX(-50%); width:120%; height:55%; background:radial-gradient(ellipse 70% 60% at 50% 100%, rgba(245,158,11,.38) 0%, rgba(245,158,11,.12) 38%, transparent 68%); pointer-events:none; z-index:1; }
.grid-ov { position:absolute; inset:0; z-index:1; pointer-events:none; background-image:linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px); background-size:56px 56px; }
.hero-body { position:relative; z-index:5; flex:1; display:grid; grid-template-columns:1fr 1fr; align-items:flex-end; padding:0 48px 64px; }
.hero-pills { display:flex; gap:10px; margin-bottom:22px; }
.pill { padding:5px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); font-size:12px; color:var(--sub); letter-spacing:.04em; }
.hero-h1 { font-size:clamp(40px,5.2vw,72px); font-weight:900; letter-spacing:-.04em; line-height:1.03; color:var(--white); }
.hero-h1 em { font-style:normal; color:var(--amber); }
.hero-right { display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-end; padding-bottom:4px; }
.hero-sub { font-size:15px; color:var(--sub); line-height:1.75; max-width:340px; margin-bottom:28px; }
.hero-cta { background:var(--amber); color:var(--black); font-size:15px; font-weight:700; padding:14px 28px; border-radius:12px; text-decoration:none; display:flex; align-items:center; gap:10px; transition:background .2s, transform .2s; border:none; font-family:inherit; cursor:pointer; animation:glowPulse 3s ease-in-out infinite; }
.hero-cta:hover { background:var(--amber2); transform:translateY(-2px); }

#p-info { background:var(--light-bg); color:var(--light-text); }
.info-bar { display:flex; align-items:center; justify-content:space-between; padding:14px 48px; border-bottom:1px solid var(--light-border); background:var(--light-card); }
.info-bar-logo { font-weight:800; font-size:16px; letter-spacing:-.03em; color:var(--light-text); }
.info-bar-tag { font-size:12px; color:var(--light-sub); background:var(--light-border); padding:4px 14px; border-radius:999px; }
.marquee-section { padding:10px 0; border-bottom:1px solid var(--light-border); background:var(--light-card); }
.info-grid { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:16px 48px 20px; overflow:hidden; }
.i-col { display:flex; flex-direction:column; gap:14px; }
.lc { background:var(--light-card); border-radius:20px; border:1px solid var(--light-border); padding:24px; }
.stat-num { font-size:clamp(42px,5.5vw,72px); font-weight:900; letter-spacing:-.05em; color:var(--light-text); line-height:1; }
.stat-lbl { font-size:12px; color:var(--light-sub); margin-top:4px; }
.stat-src { font-size:10px; color:#aaa; margin-top:2px; font-style:italic; }
.stats-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.stat-mini { background:var(--light-card); border-radius:14px; border:1px solid var(--light-border); padding:16px; }
.desc-p { font-size:13.5px; color:var(--light-sub); line-height:1.8; }
.logos-row { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.logo-chip { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:var(--light-sub); }
.logo-dot { width:18px; height:18px; border-radius:4px; }
.testi-tag { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--light-sub); margin-bottom:10px; }
.testi-q { font-size:13px; color:var(--light-sub); line-height:1.8; font-style:italic; margin-bottom:12px; }
.testi-by { font-size:13px; font-weight:700; color:var(--light-text); }
.testi-by span { font-weight:400; color:var(--light-sub); }
.tech-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.tech-lbl { font-size:13px; font-weight:600; color:var(--light-text); }
.t-pill { width:38px; height:38px; border-radius:10px; border:1px solid var(--light-border); background:var(--light-card); display:grid; place-items:center; font-size:18px; }

#p-threats { background:#0c0c0c; }
.threats-wrap { flex:1; display:flex; flex-direction:column; padding:20px 48px 24px; gap:14px; overflow:hidden; }
.sec-head { text-align:center; }
.sec-head h2 { font-size:clamp(22px,2.8vw,40px); font-weight:900; letter-spacing:-.04em; color:var(--white); }
.sec-head p { font-size:13px; color:var(--muted); margin-top:4px; }
.dash-grid { flex:1; display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:1fr 1fr; gap:10px; }
.dc { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:16px 18px; display:flex; flex-direction:column; gap:7px; overflow:hidden; position:relative; }
.dc-lbl { font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
.dc-val { font-size:clamp(18px,2vw,26px); font-weight:900; letter-spacing:-.03em; color:var(--white); }
.dc-sub { font-size:11px; color:var(--muted); }
.spark { display:flex; align-items:flex-end; gap:3px; height:30px; margin-top:auto; }
.sb { flex:1; border-radius:3px 3px 0 0; background:var(--border); min-height:4px; }
.sb.a { background:var(--amber); }
.bars { display:flex; align-items:flex-end; gap:5px; height:52px; margin-top:auto; }
.bar-g { display:flex; flex-direction:column; align-items:center; flex:1; gap:3px; }
.bar-f { width:100%; border-radius:3px 3px 0 0; background:var(--border); }
.bar-f.act { background:var(--amber); }
.bar-lbl { font-size:9px; color:var(--muted); }
.dc-wide { grid-column:span 2; }
.mini-cal { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-top:auto; flex:1; }
.mc { border-radius:4px; background:var(--border); font-size:9px; display:grid; place-items:center; color:var(--muted); aspect-ratio:1; }
.mc.hd { background:transparent; font-weight:700; }
.mc.today { background:var(--amber); color:var(--black); font-weight:700; }
.mc.scan { background:rgba(245,158,11,.22); color:var(--amber); }
.badge-row { display:flex; gap:6px; flex-wrap:wrap; }
.bdg { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:999px; font-size:10px; font-weight:600; }
.bdg.crit { background:rgba(239,68,68,.15); color:var(--red); }
.bdg.high { background:rgba(245,158,11,.15); color:var(--amber); }
.bdg.ok { background:rgba(34,197,94,.15); color:var(--green); }
.goal-num { font-size:40px; font-weight:900; letter-spacing:-.05em; color:var(--white); text-align:center; margin-top:auto; }
.goal-lbl { font-size:10px; color:var(--muted); text-align:center; }
.goal-track { height:6px; background:var(--border); border-radius:99px; overflow:hidden; }
.goal-fill { height:100%; background:var(--amber); border-radius:99px; transition:width .6s ease; }
.goal-ctrls { display:flex; align-items:center; justify-content:center; gap:10px; font-size:11px; color:var(--muted); }
.gctrl { width:24px; height:24px; background:var(--border); border:none; color:var(--text); border-radius:6px; cursor:pointer; font-size:14px; display:grid; place-items:center; }
.team-list { display:flex; flex-direction:column; gap:7px; margin-top:auto; }
.tm { display:flex; align-items:center; gap:8px; }
.av { width:24px; height:24px; border-radius:50%; display:grid; place-items:center; font-size:9px; font-weight:700; color:var(--black); flex-shrink:0; }
.tm-n { font-size:11px; color:var(--text); }
.tm-e { font-size:9px; color:var(--muted); }
.tm-r { font-size:9px; color:var(--muted); background:var(--border); padding:2px 7px; border-radius:999px; }
.chat-bub { background:var(--border); border-radius:8px; padding:7px 10px; font-size:10px; color:var(--muted); margin-top:6px; }

#p-features { background:#0a0a0a; }
.feat-wrap { flex:1; display:flex; flex-direction:column; padding:20px 48px 24px; gap:14px; overflow:hidden; }
.feat-grid { flex:1; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:12px; }
.fc { background:var(--card); border:1px solid var(--border); border-radius:20px; padding:24px 28px; display:flex; flex-direction:column; gap:8px; position:relative; overflow:hidden; transition:border-color .3s; }
.fc:hover { border-color:rgba(245,158,11,.4); }
.fc h3 { font-size:clamp(18px,2vw,26px); font-weight:900; letter-spacing:-.04em; color:var(--white); line-height:1.08; white-space:pre-line; }
.fc p { font-size:12.5px; color:var(--muted); line-height:1.75; max-width:300px; }
.icon-row { display:flex; gap:7px; flex-wrap:wrap; }
.ic { width:32px; height:32px; background:var(--border); border-radius:9px; display:grid; place-items:center; font-size:12px; color:var(--sub); transition:background .2s, color .2s; cursor:pointer; }
.ic:hover { background:var(--amber); color:var(--black); }
.world-svg { position:absolute; right:16px; top:50%; transform:translateY(-50%); width:160px; opacity:.45; pointer-events:none; }
.big-stat { font-size:clamp(32px,4vw,52px); font-weight:900; letter-spacing:-.05em; color:var(--white); margin-top:auto; line-height:1; }
.big-stat small { display:block; font-size:.4em; font-weight:600; color:var(--muted); letter-spacing:0; }
.orbit { position:absolute; right:20px; top:50%; transform:translateY(-50%); width:110px; height:110px; }
.o-ring { position:absolute; border:1px solid var(--border); border-radius:50%; }
.o-ring:nth-child(1) { inset:0; animation:spin 10s linear infinite; }
.o-ring:nth-child(2) { inset:20px; animation:spin 6s linear infinite reverse; }
.o-ring:nth-child(3) { inset:40px; animation:spin 3s linear infinite; }
.o-dot { position:absolute; width:7px; height:7px; background:var(--amber); border-radius:50%; top:-3.5px; left:50%; transform:translateX(-50%); box-shadow:0 0 8px var(--amber); }
.o-core { position:absolute; inset:40px; background:var(--amber); border-radius:50%; box-shadow:0 0 18px rgba(245,158,11,.6); }

#p-auth { background:#f2f2ef; color:var(--light-text); }
.auth-wrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:24px 48px; position:relative; }
.auth-float { position:absolute; top:24px; right:48px; background:var(--black); color:var(--white); font-size:12px; font-weight:600; padding:8px 14px; border-radius:12px; display:flex; align-items:center; gap:7px; }
.auth-star { color:var(--amber); font-size:14px; }
.auth-hd { text-align:center; }
.auth-hd h2 { font-size:clamp(20px,2.6vw,34px); font-weight:900; letter-spacing:-.04em; color:var(--light-text); }
.auth-hd h2 strong { color:var(--amber); font-style:italic; }
.auth-hd p { font-size:13.5px; color:var(--light-sub); margin-top:6px; line-height:1.7; max-width:440px; }
.auth-tabs { display:flex; background:#e4e4de; border-radius:13px; padding:4px; gap:4px; }
.at { padding:8px 30px; border-radius:10px; border:none; background:transparent; font-size:14px; font-weight:600; color:var(--light-sub); cursor:pointer; transition:all .2s; font-family:inherit; }
.at.active { background:var(--white); color:var(--light-text); box-shadow:0 1px 5px rgba(0,0,0,.07); }
.auth-card { background:var(--white); border-radius:20px; padding:30px 36px; width:100%; max-width:400px; box-shadow:0 4px 30px rgba(0,0,0,.06); }
.af { display:flex; flex-direction:column; gap:12px; }
.ai { width:100%; padding:12px 15px; border-radius:10px; border:1.5px solid var(--light-border); font-size:13.5px; color:var(--light-text); background:var(--light-bg); outline:none; font-family:inherit; transition:border-color .2s; }
.ai:focus { border-color:var(--amber); }
.ai::placeholder { color:#bbb; }
.a-btn { width:100%; padding:12px; border-radius:10px; border:none; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .2s; }
.a-btn.primary { background:var(--amber); color:var(--black); }
.a-btn.primary:hover { background:var(--amber2); transform:translateY(-1px); }
.a-btn.ghost { background:var(--light-bg); color:var(--light-text); border:1.5px solid var(--light-border); }
.a-btn.ghost:hover { border-color:#bbb; }
.a-divider { display:flex; align-items:center; gap:10px; color:#bbb; font-size:11px; }
.a-divider::before, .a-divider::after { content:''; flex:1; height:1px; background:var(--light-border); }
.a-link { text-align:center; font-size:12.5px; color:var(--light-sub); }
.a-link a { color:var(--amber); text-decoration:none; font-weight:600; }
.preview-stack { position:relative; height:100px; width:340px; margin-top:4px; flex-shrink:0; }
.pv { position:absolute; background:var(--white); border-radius:13px; box-shadow:0 4px 18px rgba(0,0,0,.08); border:1px solid var(--light-border); width:130px; height:88px; padding:10px; display:flex; flex-direction:column; gap:5px; }
.pv-line { height:5px; border-radius:3px; background:var(--light-border); }
.pv-line.a { background:rgba(245,158,11,.35); }
.pv:nth-child(1) { left:0; top:10px; transform:rotate(-7deg); }
.pv:nth-child(2) { left:105px; top:0; z-index:2; }
.pv:nth-child(3) { left:210px; top:8px; transform:rotate(6deg); }

.marquee-dark .tech-chip {
  background: rgba(255,255,255,.03);
  border-color: var(--border);
  color: var(--sub);
}
.marquee-dark .tech-chip:hover {
  border-color: var(--amber);
  color: var(--text);
}

@media (max-width: 860px) {
  .scroll-root { height: auto; }
  .panel { position: relative; height: auto; min-height: 100vh; }
  nav { padding: 16px 20px; }
  .nav-links { display: none; }
  .hero-body { grid-template-columns: 1fr; padding: 0 20px 44px; }
  .info-grid { grid-template-columns: 1fr; padding: 16px 20px 20px; }
  .threats-wrap, .feat-wrap { padding: 16px 20px 20px; }
  .dash-grid { grid-template-columns: 1fr 1fr; }
  .dc-wide { grid-column: span 2; }
  .feat-grid { grid-template-columns: 1fr; }
  .auth-wrap { padding: 20px; }
  .preview-stack { display: none; }
  .auth-float { position: static; }
  .world-svg, .orbit { display: none; }
}
`;

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
            <span>{item.emoji}</span>
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

  useEffect(() => {
    const id = "vulnscan-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = globalCSS;
      document.head.appendChild(s);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

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
                    {t.emoji}
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
                    {ic}
                  </div>
                ))}
              </div>
              <h3>{FEATURES[0].title}</h3>
              <p>{FEATURES[0].body}</p>
            </div>

            <div className="fc anim-up d200">
              <h3>{FEATURES[1].title}</h3>
              <p>{FEATURES[1].body}</p>
              <svg
                className="world-svg"
                viewBox="0 0 200 90"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g fill="rgba(245,158,11,0.55)">
                  {[
                    [22, 28, 2],
                    [30, 22, 1.5],
                    [38, 30, 2],
                    [46, 24, 1.5],
                    [54, 36, 2],
                    [60, 28, 1.5],
                    [68, 20, 2],
                    [76, 28, 1.5],
                    [82, 18, 2],
                    [88, 32, 1.5],
                    [95, 24, 2],
                    [102, 36, 1.5],
                    [108, 22, 2],
                    [116, 30, 1.5],
                    [124, 38, 2],
                    [132, 26, 1.5],
                    [140, 44, 2],
                    [148, 32, 1.5],
                    [156, 50, 2],
                    [164, 36, 1.5],
                    [38, 55, 1.5],
                    [46, 64, 2],
                    [54, 58, 1.5],
                    [98, 55, 1.5],
                    [106, 50, 2],
                  ].map(([cx, cy, r], i) => (
                    <circle key={i} cx={cx} cy={cy} r={r} />
                  ))}
                  <circle cx="102" cy="28" r="5" fill="rgba(245,158,11,0.9)" />
                </g>
              </svg>
              <div className="big-stat" style={{ marginTop: "auto" }}>
                {FEATURES[1].stat.value}
                <small>{FEATURES[1].stat.label}</small>
              </div>
            </div>

            <div className="fc anim-left d300">
              <div className="orbit">
                <div className="o-ring">
                  <div className="o-dot" />
                </div>
                <div className="o-ring">
                  <div className="o-dot" />
                </div>
                <div className="o-ring" />
                <div className="o-core" />
              </div>
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
                    {ic}
                  </div>
                ))}
              </div>
            </div>
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
