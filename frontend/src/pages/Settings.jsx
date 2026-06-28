import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import { authAPI } from "../utils/api";

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
          className={`rounded-lg text-[11.5px] font-mono border transition-all cursor-pointer ${value === opt.value
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
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/10 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] text-white">{label}</p>
        {description && <p className="text-[11.5px] text-[#888] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

function SaveButton({ onClick, children = "Save changes" }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-[#080808] text-white rounded-lg text-[11.5px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
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
  const isDanger = tone === "danger";
  const pillBgClass = isDanger ? "bg-[#E24B4A] text-white" : "bg-white text-[#080808]";
  const iconBoxClass = isDanger
    ? "bg-[#2e1a1a] border border-[#E24B4A]/30 text-[#E24B4A]"
    : "bg-gray-100 border border-gray-200 text-[#080808]";

  return (
    <div className="bg-white/10 md:bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden mb-5">
      <div className="flex items-center justify-between border-b border-white" style={{ padding: "16px 24px" }}>
        <div className={`flex items-center gap-2.5 rounded-md ${pillBgClass}`} style={{ padding: "10px" }}>
          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${iconBoxClass}`}>
            {icon}
          </div>
          <span className="text-[13px] font-semibold pr-2 tracking-tight">{title}</span>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div style={{ padding: "24px" }}>
        {description && <p className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-4">{description}</p>}
        <div className={description ? "" : "mt-4"}>{children}</div>
      </div>
    </div>
  );
}

function NavItem({ section, active, onClick }) {
  const dangerActive = "bg-[#2e1a1a] border-[#E24B4A]/40 text-[#E24B4A]";
  const dangerInactive = "bg-transparent border-transparent text-[#7a3a3a] hover:text-[#E24B4A]";
  const normalActive = "bg-[#141414] border border-[#222] lg:bg-transparent lg:border-transparent text-white";
  const normalInactive = "bg-transparent border-transparent text-[#555] hover:text-[#999]";
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
    <div className="flex items-center justify-between gap-3 py-3 border-b border-white/10 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white flex-shrink-0">
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
          <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">Display name</label>
          <input
            type="text"
            value={local.displayName}
            onChange={(e) => setLocal((p) => ({ ...p, displayName: e.target.value }))}
            maxLength={40}
            className="w-full border-b border-white/20 text-[13px] text-white outline-none focus:border-white transition-colors placeholder:text-white/40 bg-transparent"
            style={{ padding: '12px 16px' }}
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">Handle</label>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl text-[13px] text-[#ccc]" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}>
            @{profile.handle}
          </div>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">Bio</label>
        <textarea
          value={local.bio}
          onChange={(e) => setLocal((p) => ({ ...p, bio: e.target.value.slice(0, 160) }))}
          rows={3}
          placeholder="Offensive security, occasional CTF player."
          className="w-full border-b border-white/20 text-[13px] text-white outline-none focus:border-white transition-colors resize-none placeholder:text-white/40 bg-transparent"
          style={{ padding: '12px 16px' }}
        />
        <p className="text-[10.5px] font-mono text-[#888] mt-1.5 text-right">{local.bio.length}/160</p>
      </div>

      <div className="flex justify-end pt-3 border-t border-white/20" style={{ paddingBlock: '10px' }}>
        <SaveButton onClick={save} />
      </div>
    </SectionCard>
  );
}

function SecuritySection({ security, setSecurity, sessions, setSessions, showToast, profile }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function handleRevoke() {
    setSessions((prev) => prev.filter((s) => s.id !== revokeTarget.id));
    showToast("Session revoked.");
    setRevokeTarget(null);
  }

  function handleDelete() {
    showToast("Account deleted.");
    setConfirmDelete(false);
  }

  return (
    <><br />
      <SectionCard title="Password" icon={<IconShield />}>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">Current</label>
            <input
              type="password"
              value={pw.current}
              onChange={(e) => { setPw((p) => ({ ...p, current: e.target.value })); setPwError(""); }}
              className="w-full border-b border-white/20 text-[13px] text-white outline-none focus:border-white transition-colors placeholder:text-white/40 bg-transparent"
              style={{ padding: '12px 16px' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">New</label>
            <input
              type="password"
              value={pw.next}
              onChange={(e) => { setPw((p) => ({ ...p, next: e.target.value })); setPwError(""); }}
              className="w-full border-b border-white/20 text-[13px] text-white outline-none focus:border-white transition-colors placeholder:text-white/40 bg-transparent"
              style={{ padding: '12px 16px' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-[#888] mb-2">Confirm</label>
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => { setPw((p) => ({ ...p, confirm: e.target.value })); setPwError(""); }}
              className="w-full border-b border-white/20 text-[13px] text-white outline-none focus:border-white transition-colors placeholder:text-white/40 bg-transparent"
              style={{ padding: '12px 16px' }}
            />
          </div>
        </div>
        {pwError && <p className="text-[11px] text-[#E24B4A] font-mono mb-3">{pwError}</p>}
        <div className="flex justify-end pt-3 border-t border-[#111]">
          <SaveButton onClick={updatePassword}>Update password</SaveButton>
        </div>
      </SectionCard><br />

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
      </SectionCard><br />

      <SectionCard title="Active sessions" icon={<IconMonitor />} description="Devices currently signed in to your account.">
        <div>
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onRevoke={setRevokeTarget} />
          ))}
        </div>
      </SectionCard><br />

      <SectionCard title="Danger zone" icon={<IconAlert />} description="These actions affect your account and group memberships directly." tone="danger">
        <div className="flex items-center justify-between gap-4 border border-white/10 rounded-xl bg-white/5" style={{ padding: '16px' }}>
          <div>
            <p className="text-[13px] text-white">Delete account</p>
            <p className="text-[11.5px] text-[#888] mt-0.5">Permanently erase your profile and all associated data.</p>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[11px] font-mono rounded-lg bg-[#E24B4A] text-white hover:opacity-90 transition-all cursor-pointer border-none flex-shrink-0"
            style={{ paddingLeft: '14px', paddingRight: '14px', paddingTop: '8px', paddingBottom: '8px' }}
          >
            Delete account
          </button>
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
      {confirmDelete && (
        <ConfirmModal
          title="Delete account"
          message="This permanently deletes your profile, posts, comments, and group memberships. This cannot be undone."
          confirmLabel="Delete account"
          requireText={profile.handle}
          danger
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
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
      <SettingRow label="Group invites" description="An owner invites you to join their group." control={<Toggle checked={notifications.invites} onChange={() => toggle("invites")} />} />
      <SettingRow label="Mentions" description="Someone mentions your handle in a post or comment." control={<Toggle checked={notifications.mentions} onChange={() => toggle("mentions")} />} />
      <SettingRow label="Security alerts" description="New sign-ins, revoked sessions, and key changes. Always on." control={<Toggle checked disabled onChange={() => { }} />} />
    </SectionCard>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "profile", label: "Profile", icon: <IconUser /> },
  { id: "security", label: "Security", icon: <IconShield /> },
  { id: "notifications", label: "Notifications", icon: <IconBell /> },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate();
  const [section, setSection] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ handle: ME.handle, displayName: "you", initials: ME.initials, color: ME.color, bio: "" });
  const [security, setSecurity] = useState({ twoFactorEnabled: false });
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [notifications, setNotifications] = useState({ comments: true, invites: true, mentions: true });
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef(null);

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await authAPI.me();
        const user = data.user;
        setProfile({
          handle: user.username,
          displayName: user.username,
          initials: user.username.slice(0, 2).toUpperCase(),
          color: ME.color,
          bio: user.bio || "",
          email: user.email,
          avatar: user.avatar,
        });
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Redirect to login if not authenticated
        navigate('/#p-auth');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [navigate]);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ fontFamily: "'DM Sans', sans-serif", backgroundImage: `url(${mainBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center text-white"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage: `url(${mainBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="bg-transparent min-h-screen w-full">
        <div className="w-full max-w-[900px] mx-auto" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '48px', paddingBottom: '80px' }}>

          <div className="mb-7">
            <h1 className="text-[18px] font-semibold text-white tracking-tight">Settings</h1>
            <p className="text-[11px] text-[#534AB7] font-mono mt-1">Manage your profile, security, and account preferences.</p>
          </div><br />

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
                  profile={profile}
                />
              )}
              {section === "notifications" && <NotificationsSection notifications={notifications} setNotifications={setNotifications} showToast={showToast} />}
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}