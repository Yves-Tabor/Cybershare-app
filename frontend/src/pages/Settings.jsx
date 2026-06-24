import { useState, useRef, useEffect } from "react";
import mainBg from "../assets/mainBg.png";

// ─── Constants ────────────────────────────────────────────────────────────────

const ME = { handle: "you", initials: "YO", color: "#534AB7" };

const AVATAR_COLORS = [
  "#534AB7", "#0F6E56", "#993C1D", "#185FA5", "#854F0B", "#993556", "#2a6b6b", "#6b2a55",
];

const INITIAL_SESSIONS = [
  { id: 1, device: "MacBook Pro · Chrome", location: "Kigali, RW", ip: "102.89.44.12", ts: Date.now() - 1000 * 60 * 2, current: true },
  { id: 2, device: "iPhone 16 · Safari", location: "Kigali, RW", ip: "102.89.44.12", ts: Date.now() - 1000 * 60 * 60 * 6, current: false },
  { id: 3, device: "Linux · Firefox", location: "Amsterdam, NL", ip: "185.220.101.7", ts: Date.now() - 1000 * 60 * 60 * 24 * 3, current: false, unfamiliar: true },
];

const INITIAL_API_KEYS = [
  { id: 1, name: "ci-pipeline", scope: "read", key: "sk_live_4f8a91f2c3d4e5f6", created: Date.now() - 1000 * 60 * 60 * 24 * 30, lastUsed: Date.now() - 1000 * 60 * 60 * 3 },
  { id: 2, name: "burp-extension", scope: "write", key: "sk_live_9b2c7a1e8d3f4a5b", created: Date.now() - 1000 * 60 * 60 * 24 * 9, lastUsed: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function maskKey(key) {
  return key.slice(0, 8) + "••••••••" + key.slice(-4);
}

function generateKey() {
  const chars = "abcdef0123456789";
  let s = "sk_live_";
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function fingerprint(str) {
  if (!str || !str.trim()) return null;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  const hex = hash.toString(16).padStart(8, "0");
  const full = (hex + [...hex].reverse().join("")).slice(0, 16).toUpperCase();
  return full.replace(/(.{4})/g, "$1 ").trim();
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconBell = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconEye = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconKey = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5L19 11" />
  </svg>
);
const IconAlert = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconMonitor = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const IconSmartphone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);
const IconPlus = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconCopy = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] border border-[#2a2a2a] rounded-lg text-[12px] font-mono text-[#ccc] pointer-events-none whitespace-nowrap z-[200] transition-all duration-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ paddingLeft: '20px', paddingRight: '20px', paddingTop: '10px', paddingBottom: '10px' }}>
      {message}
    </div>
  );
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors cursor-pointer border-none flex-shrink-0 ${checked ? "bg-[#7F77DD]" : "bg-[#1e1e1e]"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full transition-transform ${checked ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
    </button>
  );
}

function PillSelect({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg text-[11.5px] font-mono border transition-all cursor-pointer ${
            value === opt.value
              ? "bg-[#7F77DD]/10 border-[#7F77DD]/40 text-[#7F77DD] font-semibold"
              : "border-[#1e1e1e] text-[#555] bg-transparent hover:border-[#2a2a2a] hover:text-[#888]"
          }`}
          style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '7px', paddingBottom: '7px' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SettingRow({ label, description, control }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#141414] last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] text-[#ccc]">{label}</p>
        {description && <p className="text-[11.5px] text-[#444] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

function SaveButton({ onClick, children = "Save changes" }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-white text-[#080808] rounded-lg text-[11.5px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
      style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '7px', paddingBottom: '7px' }}
    >
      {children}
    </button>
  );
}

function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — fail silently
    }
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-[#999] transition-colors bg-transparent border-none cursor-pointer flex-shrink-0">
      {copied ? (
        <>
          <span style={{ color: "#1D9E75" }}><IconCheck /></span>
          <span style={{ color: "#1D9E75" }}>Copied</span>
        </>
      ) : (
        <>
          <IconCopy />
          {label}
        </>
      )}
    </button>
  );
}

function SectionCard({ title, description, icon, action, tone = "default", children }) {
  const iconBoxClass = tone === "danger"
    ? "bg-[#2e1a1a] border-[#E24B4A]/30 text-[#E24B4A]"
    : "bg-[#141414] border-[#222] text-[#7F77DD]";
  const cardBorderClass = tone === "danger" ? "border-[#E24B4A]/20" : "border-[#1c1c1c]";
  return (
    <div className={`bg-[#080808] border ${cardBorderClass} rounded-2xl mb-5`} style={{ padding: '24px' }}>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconBoxClass}`}>{icon}</div>
          <h3 className="text-[14px] font-semibold text-white">{title}</h3>
        </div>
        {action}
      </div>
      {description && <p className="text-[12px] text-[#444] leading-relaxed mt-2 mb-4 ml-[calc(1.75rem+0.625rem)]">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

function NavItem({ section, active, onClick }) {
  const dangerActive = "bg-[#2e1a1a] border-[#E24B4A]/40 text-[#E24B4A]";
  const dangerInactive = "bg-transparent border-transparent text-[#7a3a3a] hover:text-[#E24B4A] hover:bg-[#1a1010]";
  const normalActive = "bg-[#141414] border-[#222] text-white";
  const normalInactive = "bg-transparent border-transparent text-[#555] hover:text-[#999] hover:bg-[#0e0e0e]";
  const cls = section.danger ? (active ? dangerActive : dangerInactive) : (active ? normalActive : normalInactive);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-xl text-[12.5px] font-mono transition-all cursor-pointer border text-left whitespace-nowrap ${cls}`}
      style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '10px', paddingBottom: '10px' }}
    >
      {section.icon}
      {section.label}
    </button>
  );
}

function SessionRow({ session, onRevoke }) {
  const Icon = session.device.includes("iPhone") || session.device.includes("Android") ? IconSmartphone : IconMonitor;
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[#141414] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-center text-[#666] flex-shrink-0">
          <Icon />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[12.5px] text-[#ccc] truncate">{session.device}</p>
            {session.current && (
              <span className="text-[9.5px] font-mono rounded-md bg-[#1a2a2e] text-[#1D9E75] flex-shrink-0" style={{ paddingLeft: '7px', paddingRight: '7px', paddingTop: '1px', paddingBottom: '1px' }}>
                This device
              </span>
            )}
            {session.unfamiliar && (
              <span className="text-[9.5px] font-mono rounded-md bg-[#2e2a1a] text-[#BA7517] flex-shrink-0" style={{ paddingLeft: '7px', paddingRight: '7px', paddingTop: '1px', paddingBottom: '1px' }}>
                Unrecognized
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#444] font-mono mt-0.5">{session.location} · {session.ip} · {timeAgo(session.ts)}</p>
        </div>
      </div>
      {!session.current && (
        <button
          onClick={() => onRevoke(session)}
          className="text-[11px] font-mono rounded-lg border border-[#222] text-[#666] hover:border-[#E24B4A]/50 hover:text-[#E24B4A] transition-all cursor-pointer bg-transparent flex-shrink-0"
          style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px' }}
        >
          Revoke
        </button>
      )}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, requireText, onConfirm, onClose }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const ready = !requireText || input === requireText;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ padding: '16px' }}>
      <div className="w-full max-w-[420px] bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="border-b border-[#141414]" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}>
          <p className="text-[13px] font-semibold text-white">{title}</p>
        </div>
        <div style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}>
          <p className="text-[12.5px] text-[#888] leading-relaxed">{message}</p>
          {requireText && (
            <div className="mt-4">
              <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">
                Type <span className="text-[#E24B4A]">{requireText}</span> to confirm
              </label>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] text-[#ddd] outline-none focus:border-[#2a2a2a] transition-colors font-mono"
                style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-[#141414]" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}>
          <button onClick={onClose} className="bg-transparent border border-[#222] rounded-lg text-[12px] text-[#666] hover:text-white hover:border-[#333] transition-colors cursor-pointer" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ready}
            className={`rounded-lg text-[12px] font-semibold cursor-pointer border-none transition-opacity disabled:opacity-30 disabled:cursor-not-allowed ${danger ? "bg-[#E24B4A] text-white hover:opacity-90" : "bg-white text-[#080808] hover:opacity-90"}`}
            style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateKeyModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState("read");
  const [step, setStep] = useState("form"); // "form" | "reveal"
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function create() {
    if (!name.trim()) { setError("Name is required."); return; }
    const key = generateKey();
    onCreate({ name: name.trim(), scope, key });
    setNewKey(key);
    setStep("reveal");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={(e) => e.target === e.currentTarget && step === "form" && onClose()} style={{ padding: '16px' }}>
      <div className="w-full max-w-[460px] bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#141414]" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}>
          <p className="text-[13px] font-semibold text-white">{step === "form" ? "New API key" : "Key created"}</p>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors bg-transparent border-none cursor-pointer" style={{ padding: '4px' }}>
            <IconClose />
          </button>
        </div>

        {step === "form" ? (
          <>
            <div className="space-y-4" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}>
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">Key name</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && create()}
                  placeholder="e.g. burp-extension"
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] text-[#ddd] outline-none focus:border-[#2a2a2a] transition-colors placeholder:text-[#2e2e2e]"
                  style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px' }}
                />
                {error && <p className="text-[11px] text-[#E24B4A] font-mono mt-1.5">{error}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">Scope</label>
                <PillSelect
                  options={[{ value: "read", label: "Read only" }, { value: "write", label: "Read & write" }]}
                  value={scope}
                  onChange={setScope}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[#141414]" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}>
              <button onClick={onClose} className="bg-transparent border border-[#222] rounded-lg text-[12px] text-[#666] hover:text-white hover:border-[#333] transition-colors cursor-pointer" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
                Cancel
              </button>
              <button onClick={create} className="bg-white text-[#080808] rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
                Create key
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}>
              <p className="text-[12px] text-[#888] leading-relaxed mb-4">Copy your key now — you won't be able to see it again.</p>
              <div className="flex items-center justify-between gap-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl font-mono text-[12.5px] text-[#ddd]" style={{ paddingLeft: '14px', paddingRight: '10px', paddingTop: '10px', paddingBottom: '10px' }}>
                <span className="truncate">{newKey}</span>
                <CopyButton value={newKey} />
              </div>
            </div>
            <div className="flex justify-end border-t border-[#141414]" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}>
              <button onClick={onClose} className="bg-white text-[#080808] rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function ProfileSection({ profile, setProfile, showToast }) {
  const [local, setLocal] = useState(profile);

  function save() {
    setProfile(local);
    showToast("Profile updated.");
  }

  return (
    <SectionCard title="Profile" icon={<IconUser />} description="This is how other operators see you across groups and posts.">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-[16px] font-bold text-white flex-shrink-0" style={{ background: local.color }}>
          {local.initials}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">Avatar color</p>
          <div className="flex gap-1.5 flex-wrap">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setLocal((p) => ({ ...p, color: c }))}
                className="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                style={{ background: c, borderColor: local.color === c ? "#fff" : "transparent" }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">Display name</label>
          <input
            type="text"
            value={local.displayName}
            onChange={(e) => setLocal((p) => ({ ...p, displayName: e.target.value }))}
            maxLength={40}
            className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] text-[#ddd] outline-none focus:border-[#2a2a2a] transition-colors"
            style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">Handle</label>
          <div className="flex items-center bg-[#080808] border border-[#161616] rounded-xl text-[13px] text-[#555]" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}>
            @{profile.handle}
          </div>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">Bio</label>
        <textarea
          value={local.bio}
          onChange={(e) => setLocal((p) => ({ ...p, bio: e.target.value.slice(0, 160) }))}
          rows={3}
          placeholder="Offensive security, occasional CTF player."
          className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] text-[#ddd] outline-none focus:border-[#2a2a2a] transition-colors resize-none placeholder:text-[#2e2e2e]"
          style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
        />
        <p className="text-[10.5px] font-mono text-[#333] mt-1.5 text-right">{local.bio.length}/160</p>
      </div>

      <div className="flex justify-end pt-3 border-t border-[#111]">
        <SaveButton onClick={save} />
      </div>
    </SectionCard>
  );
}

function SecuritySection({ security, setSecurity, sessions, setSessions, showToast }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pgpDraft, setPgpDraft] = useState(security.pgpKey);
  const [revokeTarget, setRevokeTarget] = useState(null);

  function updatePassword() {
    if (!pw.current || !pw.next) { setPwError("All fields are required."); return; }
    if (pw.next !== pw.confirm) { setPwError("New passwords don't match."); return; }
    if (pw.next.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    setPw({ current: "", next: "", confirm: "" });
    setPwError("");
    showToast("Password updated.");
  }

  function toggle2FA() {
    const next = !security.twoFactorEnabled;
    setSecurity((prev) => ({ ...prev, twoFactorEnabled: next }));
    showToast(next ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
  }

  function savePgp() {
    setSecurity((prev) => ({ ...prev, pgpKey: pgpDraft }));
    showToast("PGP key saved.");
  }

  function handleRevoke() {
    setSessions((prev) => prev.filter((s) => s.id !== revokeTarget.id));
    showToast("Session revoked.");
    setRevokeTarget(null);
  }

  const fp = fingerprint(pgpDraft);

  return (
    <>
      <SectionCard title="Password" icon={<IconShield />}>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">Current</label>
            <input
              type="password"
              value={pw.current}
              onChange={(e) => { setPw((p) => ({ ...p, current: e.target.value })); setPwError(""); }}
              className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] text-[#ddd] outline-none focus:border-[#2a2a2a] transition-colors"
              style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">New</label>
            <input
              type="password"
              value={pw.next}
              onChange={(e) => { setPw((p) => ({ ...p, next: e.target.value })); setPwError(""); }}
              className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] text-[#ddd] outline-none focus:border-[#2a2a2a] transition-colors"
              style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2">Confirm</label>
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => { setPw((p) => ({ ...p, confirm: e.target.value })); setPwError(""); }}
              className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[13px] text-[#ddd] outline-none focus:border-[#2a2a2a] transition-colors"
              style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}
            />
          </div>
        </div>
        {pwError && <p className="text-[11px] text-[#E24B4A] font-mono mb-3">{pwError}</p>}
        <div className="flex justify-end pt-3 border-t border-[#111]">
          <SaveButton onClick={updatePassword}>Update password</SaveButton>
        </div>
      </SectionCard>

      <SectionCard title="Two-factor authentication" icon={<IconShield />}>
        <SettingRow
          label="Authenticator app"
          description={security.twoFactorEnabled ? "Enabled — a code is required at sign-in." : "Add a second step when you sign in."}
          control={<Toggle checked={security.twoFactorEnabled} onChange={toggle2FA} />}
        />
        {security.twoFactorEnabled && (
          <div className="flex justify-end pt-3">
            <button onClick={() => showToast("Backup codes regenerated.")} className="text-[11px] font-mono text-[#555] hover:text-[#999] transition-colors bg-transparent border-none cursor-pointer">
              View backup codes
            </button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="PGP public key" icon={<IconKey />} description="Used to encrypt sensitive account notifications, if you'd like an extra layer.">
        <textarea
          value={pgpDraft}
          onChange={(e) => setPgpDraft(e.target.value)}
          rows={4}
          placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
          className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl text-[12px] text-[#ddd] outline-none focus:border-[#2a2a2a] transition-colors resize-none placeholder:text-[#2e2e2e] font-mono"
          style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px' }}
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#111]">
          <p className="text-[11px] font-mono text-[#444]">{fp ? `Fingerprint ${fp}` : "No key on file"}</p>
          <SaveButton onClick={savePgp}>Save key</SaveButton>
        </div>
      </SectionCard>

      <SectionCard title="Active sessions" icon={<IconMonitor />} description="Devices currently signed in to your account.">
        <div>
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onRevoke={setRevokeTarget} />
          ))}
        </div>
      </SectionCard>

      {revokeTarget && (
        <ConfirmModal
          title="Revoke session"
          message={`This will sign out "${revokeTarget.device}" immediately.`}
          confirmLabel="Revoke session"
          danger
          onConfirm={handleRevoke}
          onClose={() => setRevokeTarget(null)}
        />
      )}
    </>
  );
}

function NotificationsSection({ notifications, setNotifications, showToast }) {
  function toggle(key) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    showToast("Notification preferences updated.");
  }

  return (
    <SectionCard title="Notifications" icon={<IconBell />} description="Choose what you hear about and how often.">
      <SettingRow label="Comments on your posts" description="Someone replies to something you've posted in a group." control={<Toggle checked={notifications.comments} onChange={() => toggle("comments")} />} />
      <SettingRow label="Likes on your posts" description="Someone likes a post you've shared." control={<Toggle checked={notifications.likes} onChange={() => toggle("likes")} />} />
      <SettingRow label="Group invites" description="An owner invites you to join their group." control={<Toggle checked={notifications.invites} onChange={() => toggle("invites")} />} />
      <SettingRow label="Mentions" description="Someone mentions your handle in a post or comment." control={<Toggle checked={notifications.mentions} onChange={() => toggle("mentions")} />} />
      <SettingRow label="Weekly digest email" description="A summary of activity across your joined groups." control={<Toggle checked={notifications.digest} onChange={() => toggle("digest")} />} />
      <SettingRow label="Security alerts" description="New sign-ins, revoked sessions, and key changes. Always on." control={<Toggle checked disabled onChange={() => {}} />} />
    </SectionCard>
  );
}

function PrivacySection({ privacy, setPrivacy, showToast }) {
  function update(patch) {
    setPrivacy((prev) => ({ ...prev, ...patch }));
    showToast("Privacy settings updated.");
  }

  return (
    <SectionCard title="Privacy" icon={<IconEye />} description="Control what other operators can see and how they can reach you.">
      <div className="mb-5">
        <p className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2.5">Profile visibility</p>
        <PillSelect
          options={[{ value: "public", label: "Public" }, { value: "members", label: "Members only" }, { value: "private", label: "Private" }]}
          value={privacy.visibility}
          onChange={(v) => update({ visibility: v })}
        />
      </div>
      <div className="mb-1">
        <p className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#555] mb-2.5">Who can message you</p>
        <PillSelect
          options={[{ value: "everyone", label: "Everyone" }, { value: "groupmembers", label: "Group members" }, { value: "nobody", label: "No one" }]}
          value={privacy.dms}
          onChange={(v) => update({ dms: v })}
        />
      </div>
      <div className="mt-2">
        <SettingRow label="Show online status" description="Let others see when you're active." control={<Toggle checked={privacy.showOnline} onChange={(v) => update({ showOnline: v })} />} />
        <SettingRow label="Appear in member search" description="Allow your profile to show up when group owners search members." control={<Toggle checked={privacy.showInSearch} onChange={(v) => update({ showInSearch: v })} />} />
      </div>
    </SectionCard>
  );
}

function ApiSection({ apiKeys, setApiKeys, showToast }) {
  const [showCreate, setShowCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  function handleCreate({ name, scope, key }) {
    setApiKeys((prev) => [{ id: Date.now(), name, scope, key, created: Date.now(), lastUsed: null }, ...prev]);
    showToast(`"${name}" key created.`);
  }

  function handleRevoke() {
    setApiKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
    showToast(`"${revokeTarget.name}" key revoked.`);
    setRevokeTarget(null);
  }

  return (
    <SectionCard
      title="API access"
      icon={<IconKey />}
      description="Personal access tokens for scripts, extensions, and integrations."
      action={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border border-[#222] text-[#666] hover:text-white hover:border-[#333] transition-all cursor-pointer bg-transparent flex-shrink-0"
          style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
        >
          <IconPlus />
          New key
        </button>
      }
    >
      {apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <p className="text-[12px] font-mono text-[#2a2a2a]">No active keys.</p>
        </div>
      ) : (
        <div>
          {apiKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#141414] last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[12.5px] text-[#ccc] font-mono">{k.name}</p>
                  <span
                    className={`text-[9.5px] font-mono rounded-md ${k.scope === "write" ? "bg-[#2e1a1a] text-[#E24B4A]" : "bg-[#141414] text-[#666]"}`}
                    style={{ paddingLeft: '7px', paddingRight: '7px', paddingTop: '1px', paddingBottom: '1px' }}
                  >
                    {k.scope === "write" ? "Read & write" : "Read only"}
                  </span>
                </div>
                <p className="text-[11px] text-[#444] font-mono mt-0.5">
                  {maskKey(k.key)} · created {timeAgo(k.created)} · {k.lastUsed ? `used ${timeAgo(k.lastUsed)}` : "never used"}
                </p>
              </div>
              <button
                onClick={() => setRevokeTarget(k)}
                className="text-[11px] font-mono rounded-lg border border-[#222] text-[#666] hover:border-[#E24B4A]/50 hover:text-[#E24B4A] transition-all cursor-pointer bg-transparent flex-shrink-0"
                style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px' }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {revokeTarget && (
        <ConfirmModal
          title="Revoke API key"
          message={`"${revokeTarget.name}" will lose access immediately. Any integration using this key will stop working.`}
          confirmLabel="Revoke key"
          danger
          onConfirm={handleRevoke}
          onClose={() => setRevokeTarget(null)}
        />
      )}
    </SectionCard>
  );
}

function DangerSection({ showToast, profile }) {
  const [confirmType, setConfirmType] = useState(null);

  const CONFIG = {
    leave: { title: "Leave all groups", message: "You'll be removed as a member from every group you've joined. Groups you own will need a new owner first.", confirmLabel: "Leave all groups", toast: "Left all groups." },
    deactivate: { title: "Deactivate account", message: "Your profile and posts will be hidden until you sign back in. You can reactivate anytime.", confirmLabel: "Deactivate account", toast: "Account deactivated." },
    delete: { title: "Delete account", message: "This permanently deletes your profile, posts, comments, and group memberships. This cannot be undone.", confirmLabel: "Delete account", requireText: profile.handle, toast: "Account deleted." },
  };

  function handleConfirm() {
    showToast(CONFIG[confirmType].toast);
    setConfirmType(null);
  }

  return (
    <SectionCard title="Danger zone" icon={<IconAlert />} description="These actions affect your account and group memberships directly." tone="danger">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 border border-[#1c1c1c] rounded-xl" style={{ padding: '16px' }}>
          <div>
            <p className="text-[13px] text-[#ccc]">Leave all groups</p>
            <p className="text-[11.5px] text-[#444] mt-0.5">Remove your membership from every group at once.</p>
          </div>
          <button
            onClick={() => setConfirmType("leave")}
            className="text-[11px] font-mono rounded-lg border border-[#222] text-[#888] hover:border-[#333] hover:text-white transition-all cursor-pointer bg-transparent flex-shrink-0"
            style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '8px', paddingBottom: '8px' }}
          >
            Leave all
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border border-[#2e2a1a] rounded-xl" style={{ padding: '16px' }}>
          <div>
            <p className="text-[13px] text-[#ccc]">Deactivate account</p>
            <p className="text-[11.5px] text-[#444] mt-0.5">Hide your profile temporarily. Reversible.</p>
          </div>
          <button
            onClick={() => setConfirmType("deactivate")}
            className="text-[11px] font-mono rounded-lg border border-[#BA7517]/40 text-[#BA7517] hover:bg-[#BA7517]/10 transition-all cursor-pointer bg-transparent flex-shrink-0"
            style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '8px', paddingBottom: '8px' }}
          >
            Deactivate
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border border-[#E24B4A]/30 rounded-xl bg-[#1a0e0e]" style={{ padding: '16px' }}>
          <div>
            <p className="text-[13px] text-[#ccc]">Delete account</p>
            <p className="text-[11.5px] text-[#444] mt-0.5">Permanently erase your profile and all associated data.</p>
          </div>
          <button
            onClick={() => setConfirmType("delete")}
            className="text-[11px] font-mono rounded-lg bg-[#E24B4A] text-white hover:opacity-90 transition-all cursor-pointer border-none flex-shrink-0"
            style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '8px', paddingBottom: '8px' }}
          >
            Delete account
          </button>
        </div>
      </div>

      {confirmType && (
        <ConfirmModal
          title={CONFIG[confirmType].title}
          message={CONFIG[confirmType].message}
          confirmLabel={CONFIG[confirmType].confirmLabel}
          requireText={CONFIG[confirmType].requireText}
          danger
          onConfirm={handleConfirm}
          onClose={() => setConfirmType(null)}
        />
      )}
    </SectionCard>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "profile", label: "Profile", icon: <IconUser /> },
  { id: "security", label: "Security", icon: <IconShield /> },
  { id: "notifications", label: "Notifications", icon: <IconBell /> },
  { id: "privacy", label: "Privacy", icon: <IconEye /> },
  { id: "api", label: "API access", icon: <IconKey /> },
  { id: "danger", label: "Danger zone", icon: <IconAlert />, danger: true },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const [section, setSection] = useState("profile");
  const [profile, setProfile] = useState({ handle: ME.handle, displayName: "you", initials: ME.initials, color: ME.color, bio: "" });
  const [security, setSecurity] = useState({ twoFactorEnabled: false, pgpKey: "" });
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [notifications, setNotifications] = useState({ comments: true, likes: true, invites: true, mentions: true, digest: false });
  const [privacy, setPrivacy] = useState({ visibility: "public", dms: "everyone", showOnline: true, showInSearch: true });
  const [apiKeys, setApiKeys] = useState(INITIAL_API_KEYS);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef(null);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center text-[#e0e0e0]"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage: `url(${mainBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="bg-[#080808]/75 min-h-screen w-full">
        <div className="w-full max-w-[900px] mx-auto" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '48px', paddingBottom: '80px' }}>

          <div className="mb-7">
            <h1 className="text-[18px] font-semibold text-white tracking-tight">Settings</h1>
            <p className="text-[11px] text-[#444] font-mono mt-1">Manage your profile, security, and account preferences.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-8">
            <nav className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible sm:w-[176px] sm:flex-shrink-0 sm:sticky sm:top-12 sm:self-start pb-1">
              {SECTIONS.map((s) => (
                <NavItem key={s.id} section={s} active={section === s.id} onClick={() => setSection(s.id)} />
              ))}
            </nav>

            <div className="flex-1 min-w-0">
              {section === "profile" && <ProfileSection profile={profile} setProfile={setProfile} showToast={showToast} />}
              {section === "security" && (
                <SecuritySection
                  security={security}
                  setSecurity={setSecurity}
                  sessions={sessions}
                  setSessions={setSessions}
                  showToast={showToast}
                />
              )}
              {section === "notifications" && <NotificationsSection notifications={notifications} setNotifications={setNotifications} showToast={showToast} />}
              {section === "privacy" && <PrivacySection privacy={privacy} setPrivacy={setPrivacy} showToast={showToast} />}
              {section === "api" && <ApiSection apiKeys={apiKeys} setApiKeys={setApiKeys} showToast={showToast} />}
              {section === "danger" && <DangerSection showToast={showToast} profile={profile} />}
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}