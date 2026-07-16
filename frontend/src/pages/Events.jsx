import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mainBg from "../assets/mainBg.png";
import { eventsAPI, authAPI } from "../utils/api";
import { redirectToWelcomeAuth } from "../utils/authRedirect";

// ─── Constants ────────────────────────────────────────────────────────────────

const ME = { handle: "you", initials: "YO", color: "#534AB7" };

const AVATAR_COLORS = [
  "#534AB7",
  "#0F6E56",
  "#993C1D",
  "#185FA5",
  "#854F0B",
  "#993556",
  "#2a6b6b",
  "#6b2a55",
];

const CATEGORIES = [
  { label: "Conference", color: "#1D9E75", bg: "#1a2a2e" },
  { label: "Workshop", color: "#7F77DD", bg: "#1a1a2e" },
  { label: "CTF", color: "#639922", bg: "#1a2e1a" },
  { label: "Meetup", color: "#BA7517", bg: "#2e2a1a" },
  { label: "Webinar", color: "#185FA5", bg: "#16222e" },
];

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, "0");
}
function toISO(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function todayISO() {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseISO(iso) {
  return new Date(iso + "T00:00:00");
}
function formatShort(iso) {
  return parseISO(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function formatLong(iso) {
  return parseISO(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
function shortMonth(iso) {
  return parseISO(iso).toLocaleDateString("en-US", { month: "short" });
}
function dayNum(iso) {
  return parseISO(iso).getDate();
}
function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}

const TODAY = todayISO();

// ─── Small shared bits ────────────────────────────────────────────────────────

function Avatar({ initials, color, className = "w-7 h-7 text-[10px]" }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${className}`}
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

function avatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] border border-[#2a2a2a] rounded-lg text-[12px] font-mono text-[#ccc] pointer-events-none whitespace-nowrap z-[200] transition-all duration-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      style={{ padding: "10px 20px" }}
    >
      {message}
    </div>
  );
}

// ─── Create event modal ───────────────────────────────────────────────────────

function CreateEventModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Workshop");
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [formError, setFormError] = useState("");
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleCreate() {
    if (!title.trim()) {
      setFormError("Event title is required.");
      return;
    }
    if (!date) {
      setFormError("Pick a date.");
      return;
    }
    if (!time) {
      setFormError("Pick a time.");
      return;
    }
    if (!location.trim()) {
      setFormError(
        isOnline ? "Add a link or platform." : "Add a venue or address.",
      );
      return;
    }
    const cat = CATEGORIES.find((c) => c.label === category);
    onCreate({
      title: title.trim(),
      description: description.trim() || "No description provided.",
      category,
      categoryColor: cat.color,
      categoryBg: cat.bg,
      isOnline,
      location: location.trim(),
      date,
      time,
    });
  }

  const selectedCat = CATEGORIES.find((c) => c.label === category);
  const previewMonth = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
      })
    : "—";
  const previewDay = date ? new Date(date + "T00:00:00").getDate() : "–";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ padding: "16px" }}
    >
      <div className="w-full max-w-[540px] bg-white/10 md:bg-white/1 backdrop-blur-md rounded-2xl overflow-hidden">
        {/* Modal header */}
        <div
          className="flex items-center justify-between border-b border-white"
          style={{ padding: "16px 24px" }}
        >
          <div
            className="flex items-center bg-white gap-2.5 rounded-md"
            style={{ padding: "10px" }}
          >
            <div className="w-6 h-6 rounded-md bg-gray border border-gray flex items-center justify-center">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7F77DD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className="app-title-text text-[13px] font-semibold text-[#080808]">
              Post an event
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            style={{ padding: "4px" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div
          className="space-y-5 max-h-[75vh] overflow-y-auto"
          style={{ padding: "24px" }}
        >
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Event Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFormError("");
              }}
              placeholder="e.g. Sigma Rule Writing Workshop"
              maxLength={80}
              className="w-full bg-transparent border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{ padding: "12px 16px" }}
            />
          </div>
          <br />

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should people expect?"
              rows={3}
              className="w-full bg-transparent border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors resize-none placeholder:text-silver"
              style={{ padding: "12px 16px" }}
            />
          </div>
          <br />

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setCategory(cat.label)}
                  className={`rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    category === cat.label
                      ? "border-current font-semibold"
                      : "border-silver text-silver bg-transparent hover:border-white hover:text-white"
                  }`}
                  style={{
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    paddingTop: "6px",
                    paddingBottom: "6px",
                    ...(category === cat.label
                      ? {
                          color: cat.color,
                          background: cat.bg,
                          borderColor: cat.color + "55",
                        }
                      : {}),
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <br />

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2.5">
              Format
            </label>
            <div className="flex gap-2">
              {[
                { k: true, l: "Online" },
                { k: false, l: "In-person" },
              ].map((opt) => (
                <button
                  key={opt.l}
                  onClick={() => {
                    setIsOnline(opt.k);
                    setFormError("");
                  }}
                  className={`flex-1 rounded-lg text-[11.5px] font-mono border transition-all cursor-pointer ${
                    isOnline === opt.k
                      ? "border-[#7F77DD]/50 text-[#7F77DD] bg-[#7F77DD]/10"
                      : "border-silver text-silver bg-transparent hover:border-white hover:text-white"
                  }`}
                  style={{ padding: "8px 12px" }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <br />

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
              {isOnline ? "Link or platform" : "Venue or address"}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setFormError("");
              }}
              placeholder={
                isOnline
                  ? "Discord, Zoom, Twitch…"
                  : "Street address or venue name"
              }
              className="w-full bg-transparent border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors placeholder:text-silver"
              style={{ padding: "12px 16px" }}
            />
          </div>
          <br />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
                Date
              </label>
              <input
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setFormError("");
                }}
                className="w-full bg-transparent border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors"
                style={{ padding: "12px 16px", colorScheme: "dark" }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-gray-100 mb-2">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setFormError("");
                }}
                className="w-full bg-transparent border-b border-silver text-[13px] text-white outline-none focus:border-gray transition-colors"
                style={{ padding: "12px 16px", colorScheme: "dark" }}
              />
            </div>
          </div>

          {/* Preview */}
          <div
            className="border border-gray rounded-xl bg-gray"
            style={{ padding: "16px" }}
          >
            <p className="text-[9.5px] font-mono text-silver tracking-[0.15em] uppercase mb-3">
              Preview
            </p>
            <div className="flex items-start gap-3">
              <div
                className="flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 border"
                style={{
                  background: selectedCat.bg,
                  borderColor: selectedCat.color + "22",
                }}
              >
                <span
                  className="text-[8px] font-mono uppercase tracking-wider"
                  style={{ color: selectedCat.color }}
                >
                  {previewMonth}
                </span>
                <span className="text-[14px] font-bold text-white leading-none mt-0.5">
                  {previewDay}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="app-title-text text-[13px] font-semibold text-white truncate">
                    {title || "Event title"}
                  </p>
                  <span
                    className="text-[10px] font-mono rounded-md flex-shrink-0"
                    style={{
                      background: selectedCat.bg,
                      color: selectedCat.color,
                      padding: "2px 8px",
                    }}
                  >
                    {category}
                  </span>
                </div>
                <p className="text-[12px] text-silver leading-relaxed line-clamp-2">
                  {description || "Your description will appear here."}
                </p>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-[11px] text-white font-mono">{formError}</p>
          )}
        </div>

        {/* Modal footer */}
        <div
          className="flex justify-end gap-2.5 border-t border-white bg-white/10"
          style={{ padding: "16px 24px" }}
        >
          <button
            onClick={onClose}
            className="bg-transparent border border-white rounded-lg text-[12px] text-white hover:text-silver transition-colors cursor-pointer"
            style={{ padding: "8px 16px" }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 bg-[#080808] text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none"
            style={{ padding: "8px 16px" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Post event
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event card (events list) ─────────────────────────────────────────────────

function EventCard({ event, onToggleCalendar, onDelete, currentUser }) {
  return (
    <div
      className="border-2 border-[#1c1c1c] rounded-2xl hover:border-[#242424] transition-colors"
      style={{ padding: "20px" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 border"
          style={{
            background: event.categoryBg,
            borderColor: event.categoryColor + "22",
          }}
        >
          <span
            className="text-[9px] font-mono uppercase tracking-wider"
            style={{ color: event.categoryColor }}
          >
            {shortMonth(event.date)}
          </span>
          <span className="text-[16px] font-bold text-white leading-none mt-0.5">
            {dayNum(event.date)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="app-title-text text-[14px] font-semibold text-white">
              {event.title}
            </span>
            <span
              className="text-[10px] font-mono rounded-md"
              style={{
                background: event.categoryBg,
                color: event.categoryColor,
                padding: "2px 8px",
              }}
            >
              {event.category}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#555] font-mono mb-2.5 flex-wrap">
            <span>
              {formatShort(event.date)} · {formatTime(event.time)}
            </span>
            <span className="text-[#222]">·</span>
            <span className="flex items-center gap-1.5">
              {event.isOnline ? (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              ) : (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              )}
              {event.location}
            </span>
          </div>

          <p className="text-[12.5px] text-[#555] leading-relaxed mb-3.5 line-clamp-2">
            {event.description}
          </p>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                initials={event.host.slice(0, 2).toUpperCase()}
                color={avatarColor(event.host)}
                className="w-5 h-5 text-[8px]"
              />
              <span className="text-[11px] text-[#444] font-mono truncate">
                Hosted by {event.host} · {event.attendees} going
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {currentUser?.id === event.hostId && (
                <button
                  onClick={() => onDelete(event.id)}
                  className="flex items-center gap-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex-shrink-0 bg-transparent border-red-500/40 text-red-500 hover:bg-red-500/10"
                  style={{ padding: "6px 12px" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete
                </button>
              )}
              <button
                onClick={() => onToggleCalendar(event.id)}
                className={`flex items-center gap-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                  event.addedToCalendar
                    ? "border-[#1D9E75]/40 text-[#1D9E75] bg-[#1D9E75]/10 hover:border-[#E24B4A]/50 hover:text-[#E24B4A] hover:bg-[#E24B4A]/10"
                    : "bg-[#7F77DD]/10 border-[#7F77DD]/40 text-[#7F77DD] hover:bg-[#7F77DD]/20"
                }`}
                style={{ padding: "6px 12px" }}
              >
              {event.addedToCalendar ? (
                <>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Added
                </>
              ) : (
                <>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add to calendar
                </>
              )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini row inside the calendar day panel ───────────────────────────────────

function MiniEventRow({ event, onToggleCalendar }) {
  return (
    <div
      className="flex items-center gap-3 bg-[#0a0a0a] border border-[#161616] rounded-xl"
      style={{ padding: "12px 14px" }}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: event.categoryColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="app-title-text text-[12.5px] font-semibold text-white truncate">
          {event.title}
        </p>
        <p className="text-[10.5px] text-[#444] font-mono mt-0.5 truncate">
          {formatTime(event.time)} · {event.location}
        </p>
      </div>
      <button
        onClick={() => onToggleCalendar(event.id)}
        className="text-[10px] font-mono text-[#333] hover:text-[#E24B4A] transition-colors flex-shrink-0 bg-transparent border-none cursor-pointer"
      >
        Remove
      </button>
    </div>
  );
}

// ─── Calendar view ─────────────────────────────────────────────────────────────

function buildGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((daysInMonth + firstWeekday) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstWeekday + 1;
    const cellDate = new Date(year, month, dayOffset);
    cells.push({
      iso: toISO(
        cellDate.getFullYear(),
        cellDate.getMonth(),
        cellDate.getDate(),
      ),
      day: cellDate.getDate(),
      inMonth: cellDate.getMonth() === month,
      year: cellDate.getFullYear(),
      monthIdx: cellDate.getMonth(),
    });
  }
  return cells;
}

function getDots(dayEvents) {
  if (dayEvents.length === 0) return [];
  const colors = dayEvents.map((e) => e.categoryColor);
  return [0, 1, 2].map((i) => colors[i % colors.length]);
}

function CalendarView({ events, onToggleCalendar, onDelete, currentUser }) {
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState(null);

  const addedEvents = events.filter((e) => e.addedToCalendar);
  const cells = buildGrid(cursor.year, cursor.month);
  const isCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  function prevMonth() {
    setCursor(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }
  function nextMonth() {
    setCursor(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }
  function goToday() {
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }
  function handleCellClick(cell) {
    setSelectedDay(cell.iso);
    if (!cell.inMonth) setCursor({ year: cell.year, month: cell.monthIdx });
  }

  const dayEventsForSelected = selectedDay
    ? addedEvents.filter((e) => e.date === selectedDay)
    : [];

  return (
    <div
      className="flex flex-col md:flex-row gap-7"
      style={{ paddingTop: "30px" }}
    >
      <div
        className="border-2 border-[#1c1c1c] rounded-2xl flex-shrink-0 w-full md:w-[380px]"
        style={{ padding: "20px" }}
      >
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={prevMonth}
            className="text-white hover:text-white transition-colors bg-transparent border-none cursor-pointer hover:bg-[#141414] rounded-lg"
            style={{ padding: "6px" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-semibold text-white tracking-tight">
              {monthLabel(cursor.year, cursor.month)}
            </h2>
            {!isCurrentMonth && (
              <button
                onClick={goToday}
                className="text-[10px] font-mono text-silver hover:text-white transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
                style={{ padding: 0 }}
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={nextMonth}
            className="text-[#444] hover:text-white transition-colors bg-transparent border-none cursor-pointer hover:bg-[#141414] rounded-lg"
            style={{ padding: "6px" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[9px] font-mono text-silver tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell) => {
            const dayEvents = addedEvents.filter((e) => e.date === cell.iso);
            const dots = getDots(dayEvents);
            const isToday = cell.iso === TODAY;
            const isSelected = cell.iso === selectedDay;
            return (
              <button
                key={cell.iso}
                onClick={() => handleCellClick(cell)}
                className={`relative aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#7F77DD]/60 bg-[#7F77DD]/10"
                    : isToday
                      ? "border-[#333] bg-[#0d0d0d]"
                      : "border-[#141414] hover:border-[#222] hover:bg-[#0a0a0a]"
                }`}
              >
                <span
                  className={`text-[11.5px] font-mono ${
                    !cell.inMonth
                      ? "text-[#222]"
                      : isToday
                        ? "text-white font-bold"
                        : isSelected
                          ? "text-[#bbb]"
                          : "text-[#888]"
                  }`}
                >
                  {cell.day}
                </span>
                <div className="flex gap-[3px] h-[4px]">
                  {dots.map((c, i) => (
                    <span
                      key={i}
                      className="w-[4px] h-[4px] rounded-full"
                      style={{
                        background: c,
                        opacity: cell.inMonth ? 1 : 0.35,
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <p className="text-[10.5px] font-mono text-silver text-center mb-5 md:text-left">
          Showing events you've added · switch to Events to add more
        </p>

        <div
          className="bg-[#080808] border border-[#1c1c1c] rounded-2xl flex-1"
          style={{ padding: "20px" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[9.5px] font-mono font-bold text-silver tracking-[0.18em] uppercase whitespace-nowrap">
              {selectedDay ? formatLong(selectedDay) : "Select a day"}
            </p>
            <div className="flex-1 h-px bg-white" />
          </div>

          {!selectedDay && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#222"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p className="text-[12px] font-mono text-gray-400">
                Tap a day with dots to see what you've added.
              </p>
            </div>
          )}

          {selectedDay && dayEventsForSelected.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <p className="text-[12px] font-mono text-gray-400">
                No events added for this day.
              </p>
            </div>
          )}

          {selectedDay && dayEventsForSelected.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {dayEventsForSelected.map((e) => (
                <MiniEventRow
                  key={e.id}
                  event={e}
                  onToggleCalendar={onToggleCalendar}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("events"); // "events" | "calendar"
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "added"
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef(null);

  // Fetch events and current user on mount
  useEffect(() => {
    async function fetchData() {
      try {
        try {
          const userResponse = await authAPI.me();
          setCurrentUser(userResponse.user);
        } catch (err) {
          console.error("Failed to fetch user role:", err);
        }

        const data = await eventsAPI.getAll();
        const categoryMap = {
          conference: { label: "Conference", color: "#1D9E75", bg: "#1a2a2e" },
          workshop: { label: "Workshop", color: "#7F77DD", bg: "#1a1a2e" },
          ctf: { label: "CTF", color: "#639922", bg: "#1a2e1a" },
          meetup: { label: "Meetup", color: "#BA7517", bg: "#2e2a1a" },
          webinar: { label: "Webinar", color: "#185FA5", bg: "#16222e" },
        };
        const transformedEvents = data.events.map((e) => {
          const lowerCat = e.category ? e.category.toLowerCase() : "";
          const cat = categoryMap[lowerCat] || {
            label: e.category || "Workshop",
            color: "#7F77DD",
            bg: "#1a1a2e",
          };
          // API returns camelCase: startDate, attendeeCount, createdBy.username
          const startDateStr = e.startDate || e.start_date || "";
          return {
            id: e.id,
            title: e.title,
            description: e.description,
            category: cat.label,
            categoryColor: cat.color,
            categoryBg: cat.bg,
            date: startDateStr ? startDateStr.split("T")[0] : "",
            time: startDateStr ? (startDateStr.split("T")[1]?.slice(0, 5) || "00:00") : "00:00",
            isOnline:
              e.location?.toLowerCase().includes("http") ||
              e.location?.toLowerCase().includes("discord") ||
              e.location?.toLowerCase().includes("zoom"),
            location: e.location || "TBD",
            host: e.createdBy?.username || e.username || "Unknown",
            attendees: e.attendeeCount ?? e.attendee_count ?? 0,
            addedToCalendar: e.isRegistered || e.registered || false,
          };
        });
        setEvents(transformedEvents);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        if (error.status === 401 || error.message === "API request failed") {
          redirectToWelcomeAuth(navigate);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      2800,
    );
  }

  async function handleToggleCalendar(id) {
    const event = events.find((e) => e.id === id);
    if (!event) return;

    try {
      if (event.addedToCalendar) {
        await eventsAPI.unregister(id);
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id !== id) return e;
            showToast(`Removed "${e.title}" from your calendar`);
            return { ...e, addedToCalendar: false };
          }),
        );
      } else {
        await eventsAPI.register(id);
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id !== id) return e;
            showToast(`Added "${e.title}" to your calendar`);
            return { ...e, addedToCalendar: true };
          }),
        );
      }
    } catch (error) {
      console.error("Failed to toggle calendar:", error);
      showToast("Failed to update calendar.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await eventsAPI.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      showToast("Event deleted");
    } catch (error) {
      console.error("Failed to delete event:", error);
      showToast("Failed to delete event.");
    }
  }

  async function handleCreate(data) {
    try {
      const categoryMap = {
        conference: { label: "Conference", color: "#1D9E75", bg: "#1a2a2e" },
        workshop: { label: "Workshop", color: "#7F77DD", bg: "#1a1a2e" },
        ctf: { label: "CTF", color: "#639922", bg: "#1a2e1a" },
        meetup: { label: "Meetup", color: "#BA7517", bg: "#2e2a1a" },
        webinar: { label: "Webinar", color: "#185FA5", bg: "#16222e" },
      };
      await eventsAPI.create(
        data.title,
        data.description,
        data.location,
        `${data.date}T${data.time}`,
        `${data.date}T${data.time}`,
        null,
        data.category.toLowerCase(),
        "upcoming",
      );
      // Refresh events
      const response = await eventsAPI.getAll();
      const transformedEvents = response.events.map((e) => {
        const lowerCat = e.category ? e.category.toLowerCase() : "";
        const cat = categoryMap[lowerCat] || {
          label: e.category || "Workshop",
          color: "#7F77DD",
          bg: "#1a1a2e",
        };
        const startDateStr = e.startDate || e.start_date || "";
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          category: cat.label,
          categoryColor: cat.color,
          categoryBg: cat.bg,
          date: startDateStr ? startDateStr.split("T")[0] : "",
          time: startDateStr ? (startDateStr.split("T")[1]?.slice(0, 5) || "00:00") : "00:00",
          isOnline:
            e.location?.toLowerCase().includes("http") ||
            e.location?.toLowerCase().includes("discord") ||
            e.location?.toLowerCase().includes("zoom"),
          location: e.location || "TBD",
          host: e.createdBy?.username || e.username || "Unknown",
          attendees: e.attendeeCount ?? e.attendee_count ?? 0,
          addedToCalendar: e.isRegistered || e.registered || false,
        };
      });
      setEvents(transformedEvents);
      setShowCreate(false);
      showToast(`"${data.title}" posted and added to your calendar`);
    } catch (error) {
      console.error("Failed to create event:", error);
      showToast("Failed to create event.");
    }
  }

  const addedCount = events.filter((e) => e.addedToCalendar).length;

  const filteredEvents = events
    .filter((e) => filter === "all" || e.addedToCalendar)
    .filter((e) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        formatLong(e.date).toLowerCase().includes(q) ||
        e.date.includes(q)
      );
    })
    .sort((a, b) =>
      a.date === b.date
        ? a.time.localeCompare(b.time)
        : a.date.localeCompare(b.date),
    );

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-[#e0e0e0]"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          backgroundImage: `url(${mainBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center text-[#e0e0e0]"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage: `url(${mainBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="bg-transparent min-h-screen">
        <div
          className="w-[375px] sm:w-[768px] lg:w-[1100px] mx-auto"
          style={{ padding: "48px 32px 80px" }}
        >
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-[18px] font-semibold text-white tracking-tight">
                Events
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[11px] text-gray-400 md:text-[#444] font-mono">
                  {events.length} posted
                </p>
                {addedCount > 0 && (
                  <>
                    <span className="text-gray-400 md:text-[#444]">·</span>
                    <p className="text-[11px] text-gray-400 md:text-[#444] font-mono">
                      {addedCount} in your calendar
                    </p>
                  </>
                )}
              </div>
            </div>
            {view === "events" && (currentUser?.role === "admin" || currentUser?.role === "moderator") && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 text-white rounded-lg text-[12px] font-semibold cursor-pointer hover:opacity-90 transition-opacity border-none flex-shrink-0"
                style={{ padding: "8px 16px" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                  Post event
              </button>
            )}
          </div>

          {/* Events / Calendar toggle */}
          <div
            className="flex bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl gap-1 mb-6"
            style={{ padding: "4px" }}
          >
            <button
              onClick={() => setView("events")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[12px] font-mono transition-colors cursor-pointer border-none ${
                view === "events"
                  ? "bg-white text-black"
                  : "bg-transparent text-white hover:text-[#777]"
              }`}
              style={{ padding: "10px 16px" }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Events
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-[12px] font-mono transition-colors cursor-pointer border-none ${
                view === "calendar"
                  ? "bg-white text-black"
                  : "bg-transparent text-white hover:text-[#777]"
              }`}
              style={{ padding: "10px 16px" }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Calendar
            </button>
          </div>

          {view === "events" && (
            <>
              {/* Search + filter */}
              <div
                className="flex flex-col sm:flex-row gap-2.5 mb-6"
                style={{ padding: "10px 12px" }}
              >
                <div className="relative flex-1">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white pointer-events-none"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title or day…"
                    className="w-full bg-transparent rounded-xl text-[12.5px] font-mono text-white outline-none focus:border-[#2a2a2a] transition-colors placeholder:text-white"
                    style={{ padding: "10px 16px 10px 36px" }}
                  />
                </div>
                <div className="flex w-fit rounded-xl overflow-hidden">
                  {[
                    { k: "all", l: "All" },
                    { k: "added", l: "Added" },
                  ].map((f) => (
                    <button
                      key={f.k}
                      onClick={() => setFilter(f.k)}
                      className={`text-[11.5px] font-mono transition-colors cursor-pointer border-none ${
                        filter === f.k
                          ? "bg-white text-black"
                          : "bg-transparent text-white hover:text-[#777]"
                      }`}
                      style={{ padding: "10px 16px" }}
                    >
                      {f.l}
                    </button>
                  ))}
                </div>
              </div>
              <br />

              <div className="flex items-center gap-3 mb-4">
                <p className="text-[9.5px] font-mono font-bold text-white tracking-[0.18em] uppercase whitespace-nowrap">
                  {query || filter !== "all"
                    ? `${filteredEvents.length} result${filteredEvents.length !== 1 ? "s" : ""}`
                    : "All events"}
                </p>
                <div className="flex-1 h-px bg-white" />
              </div>
              <br />

              {filteredEvents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredEvents.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      onToggleCalendar={handleToggleCalendar}
                      onDelete={handleDelete}
                      currentUser={currentUser}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-3"
                  style={{ padding: "64px 0" }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#222"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p className="text-[12px] font-mono text-[#2a2a2a]">
                    No events found.
                  </p>
                  {filter === "added" && (
                    <button
                      onClick={() => setFilter("all")}
                      className="text-[11px] font-mono text-[#444] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
                    >
                      Browse all events
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {view === "calendar" && (
            <CalendarView
              events={events}
              onToggleCalendar={handleToggleCalendar}
            />
          )}
        </div>
      </div>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
