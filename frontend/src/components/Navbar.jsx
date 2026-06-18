import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const SITE_CONFIG = {
  name: "Cybershare",
  logoMark: "CS",
};

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/main",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 12 3l9 6.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    label: "Scanner",
    path: "/main/scanner",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    label: "Resources",
    path: "/main/resources",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    label: "Community",
    path: "/main/community",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Events",
    path: "/main/events",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Saved Items",
    path: "/main/saved",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    path: "/main/settings",
    icon: (
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const HamburgerIcon = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {open ? (
      <>
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </>
    ) : (
      <>
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
      </>
    )}
  </svg>
);

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="21"
    height="21"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
  </svg>
);

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);

  // Close when clicking outside — excluding the toggle button and the panel itself
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function toggle() {
    setOpen((prev) => !prev);
  }

  return (
    <>
      <header className="sticky top-0 z-[60] flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#080808]">
        <button
          ref={toggleRef}
          onClick={toggle}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="nav-panel"
          className="flex items-center justify-center w-9 h-9 rounded-full text-[#e0e0e0]/80 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <HamburgerIcon open={open} />
        </button>

        <Link
          to="/main"
          className="flex items-center gap-2"
          style={{ fontFamily: "'Chelsea Market', cursive" }}
        >
          <div
            className="w-7 h-7 rounded-md bg-white text-black grid place-items-center font-bold text-[11px]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {SITE_CONFIG.logoMark}
          </div>
          <span className="text-[15px] tracking-tight text-white">
            {SITE_CONFIG.name}
          </span>
        </Link>

        <button
          aria-label="Account"
          className="flex items-center justify-center w-9 h-9 rounded-full text-[#e0e0e0]/80 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <UserIcon />
        </button>
      </header>

      {/* Overlay */}
      <div
        aria-hidden={!open}
        className={`fixed top-9 left-0 right-0 bottom-0 z-[55] flex transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Sidebar background panel */}
        <div className="w-[220px] flex-shrink-0 h-full bg-[#111] border-r border-[#222] relative">

          {/* Nav items float ON TOP of the sidebar */}
          <nav
        id="nav-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="absolute inset-0 flex flex-col items-center gap-3 sm:gap-3 px-3 sm:px-4 pt-[79px] pb-6 z-10"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-[#cfd2d8] hover:text-white transition-colors text-[13px] sm:text-[14px] font-medium whitespace-nowrap"
          >
            <span className="text-[#cfd2d8] flex-shrink-0">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
        </div>

  {/* Dismiss area */}
  <div
    onClick={() => setOpen(false)}
    className="flex-1 h-full bg-black/80 backdrop-blur-sm cursor-default"
  />
</div>
    </>
  );
}