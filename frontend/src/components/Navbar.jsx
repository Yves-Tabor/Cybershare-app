import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { authAPI, notificationsAPI, clearToken, getToken } from "../utils/api";
import { redirectToWelcomeAuth } from "../utils/authRedirect";

const SITE_CONFIG = {
  name: "Cybershare",
  logoMark: "CS",
};

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/main",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9.5 12 3l9 6.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    label: "Scanner",
    path: "/main/scanner",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    label: "Community",
    path: "/main/community",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
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
    ),
  },
  {
    label: "Saved Items",
    path: "/main/saved",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    path: "/main/settings",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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

function NotifIcon({ type }) {
  if (type === "comment")
    return (
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
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  if (type === "bookmark")
    return (
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
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    );
  return (
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── User Panel ───────────────────────────────────────────────────────────────

function UserPanel({
  user,
  notifications,
  onMarkAllRead,
  onClearAll,
  onClose,
  onSignOut,
  panelRef,
  navigate,
}) {
  const [showClearAll, setShowClearAll] = useState(false);
  const clearAllTimer = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  useEffect(() => {
    // Clear timer on unmount
    return () => {
      if (clearAllTimer.current) {
        clearTimeout(clearAllTimer.current);
      }
    };
  }, []);

  function handleMarkAllRead() {
    onMarkAllRead();
    // Show clear all button after 2 seconds
    if (clearAllTimer.current) {
      clearTimeout(clearAllTimer.current);
    }
    clearAllTimer.current = setTimeout(() => {
      setShowClearAll(true);
    }, 2000);
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: 46,
        right: 8,
        width: 300,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e5e5",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
        zIndex: 9999,
      }}
    >
      {/* User header */}
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#7F77DD",
              border: "2px solid #ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontFamily: "monospace",
              fontWeight: "bold",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "monospace",
                fontWeight: "bold",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                background: "#7F77DD",
                color: "#ffffff",
                borderRadius: "999px",
                padding: "3px 8px",
                flexShrink: 0,
              }}
            >
              {user?.role || "Member"}
            </span>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#666",
              }}
            >
              {user?.username || "user"}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "10px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#1D9E75",
              flexShrink: 0,
            }}
          />
          <span
            style={{ fontSize: "10px", fontFamily: "monospace", color: "#666" }}
          >
            Active · Joined {joinedDate}
          </span>
        </div>
      </div>

      {/* Notifications header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "9.5px",
              fontFamily: "monospace",
              fontWeight: "bold",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#666",
            }}
          >
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: "9px",
                fontFamily: "monospace",
                fontWeight: "bold",
                background: "#7F77DD",
                color: "#ffffff",
                borderRadius: "999px",
                padding: "1px 7px",
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#666",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#111")}
              onMouseLeave={(e) => (e.target.style.color = "#666")}
            >
              mark all read
            </button>
          )}
          {showClearAll && notifications.length > 0 && (
            <button
              onClick={onClearAll}
              style={{
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#E24B4A",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#c0392b")}
              onMouseLeave={(e) => (e.target.style.color = "#E24B4A")}
            >
              clear all
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "28px 20px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ccc"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#999",
                margin: 0,
              }}
            >
              0 notifications
            </p>
          </div>
        ) : (
          notifications.map((notif, i) => (
            <div
              key={notif.id}
              onClick={async () => {
                // Mark as read
                try {
                  await notificationsAPI.markAsRead(notif.id);
                } catch (e) {
                  // non-critical
                }
                onClose();
                // Navigate based on type
                if (notif.type === "COMMUNITY" && notif.relatedId) {
                  navigate(`/main/community?group=${notif.relatedId}`);
                } else if (
                  (notif.type === "SCAN_COMPLETED" || notif.type === "SCAN_FAILED" || notif.type === "SECURITY_ALERT") &&
                  notif.relatedId
                ) {
                  navigate(`/main/scanner`);
                } else if (notif.type === "EVENT" && notif.relatedId) {
                  navigate(`/main/events`);
                }
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "12px 20px",
                background: notif.unread ? "#f5f3ff" : "transparent",
                borderBottom:
                  i !== notifications.length - 1 ? "1px solid #f0f0f0" : "none",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = notif.unread ? "#ede9fc" : "#f9f9f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = notif.unread ? "#f5f3ff" : "transparent";
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                  background: notif.unread ? "#7F77DD" : "#f0f0f0",
                  border: notif.unread ? "none" : "1px solid #e5e5e5",
                  color: notif.unread ? "#ffffff" : "#999",
                }}
              >
                <NotifIcon type={notif.type} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    lineHeight: 1.4,
                    color: notif.unread ? "#111" : "#666",
                  }}
                >
                  {notif.message}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "10px",
                    fontFamily: "monospace",
                    color: "#999",
                  }}
                >
                  {notif.time}
                </p>
              </div>
              {notif.unread && (
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#7F77DD",
                    flexShrink: 0,
                    marginTop: "6px",
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          padding: "12px 20px",
          gap: "0",
          background: "#fafafa",
        }}
      >
        <Link
          to="/main/settings"
          onClick={onClose}
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#666",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#111")}
          onMouseLeave={(e) => (e.target.style.color = "#666")}
        >
          settings
        </Link>
        <div
          style={{ width: "1px", background: "#e5e5e5", alignSelf: "stretch" }}
        />
        <button
          onClick={onSignOut}
          style={{
            flex: 1,
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#E24B4A",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#c0392b")}
          onMouseLeave={(e) => (e.target.style.color = "#E24B4A")}
        >
          sign out
        </button>
      </div>
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);
  const userPanelRef = useRef(null);
  const userToggleRef = useRef(null);

  function transformNotification(notification) {
    return {
      id: notification.id,
      type: notification.type || "system",
      title: notification.title,
      message: notification.message,
      relatedId: notification.relatedId ?? notification.related_id ?? null,
      time: notification.createdAt
        ? new Date(notification.createdAt).toLocaleString()
        : notification.created_at
          ? new Date(notification.created_at).toLocaleString()
          : "Just now",
      unread:
        notification.isRead !== undefined
          ? !notification.isRead
          : !notification.read_at,
    };
  }

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await authAPI.me();
        setUser(data.user);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        // If not authenticated, redirect to login
        if (error.status === 401 || error.message === "API request failed") {
          redirectToWelcomeAuth(navigate);
        }
      }
    }
    fetchUser();
  }, [navigate]);

  // Fetch notifications on mount
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const data = await notificationsAPI.getAll();
        const transformedNotifications = data.notifications.map(
          transformNotification,
        );
        setNotifications(transformedNotifications);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    }

    fetchNotifications();

    window.addEventListener(
      "cybershare:notifications-refresh",
      fetchNotifications,
    );
    return () =>
      window.removeEventListener(
        "cybershare:notifications-refresh",
        fetchNotifications,
      );
  }, []);

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

  // Close user panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        userOpen &&
        userPanelRef.current &&
        !userPanelRef.current.contains(e.target) &&
        userToggleRef.current &&
        !userToggleRef.current.contains(e.target)
      ) {
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (open) setOpen(false);
        if (userOpen) setUserOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, userOpen]);

  // Realtime notifications via socket.io
  useEffect(() => {
    if (!user?.id) return;

    const socketServerUrl = (
      import.meta.env.VITE_API_URL || "http://localhost:5000/api"
    ).replace(/\/api\/?$/, "");

    const socket = io(socketServerUrl, {
      withCredentials: true,
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      socket.emit("register-user", user.id);
    });

    socket.on("notification:new", (notification) => {
      const transformed = transformNotification(notification);
      setNotifications((prev) => {
        if (prev.some((n) => n.id === transformed.id)) {
          return prev;
        }
        return [transformed, ...prev];
      });
    });

    socket.on("scan:completed", async () => {
      try {
        const data = await notificationsAPI.getAll();
        setNotifications(data.notifications.map(transformNotification));
      } catch (error) {
        console.error("Failed to refresh notifications after scan:", error);
      }
    });

    const sha256 = async (message) => {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      return hashHex;
    };

    socket.on("session:revoked", async (data) => {
      const localToken = getToken();
      if (localToken) {
        const localHash = await sha256(localToken);
        if (localHash === data.tokenHash) {
          clearToken();
          // We can also redirect
          redirectToWelcomeAuth(navigate);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, navigate]);

  function toggle() {
    setOpen((prev) => !prev);
  }

  function toggleUser() {
    setUserOpen((prev) => !prev);
    if (open) setOpen(false);
  }

  async function markAllRead() {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }

  async function handleClearAll() {
    try {
      await notificationsAPI.deleteAll();
      setNotifications([]);
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
    }
  }

  async function handleSignOut() {
    try {
      await authAPI.logout();
      clearToken();
      setUser(null);
      setUserOpen(false);
      navigate("/#p-auth");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  }

  return (
    <>
      <header
        className="sticky top-0 z-[60] flex items-center justify-between bg-[#080808]"
        style={{
          paddingLeft: "5px",
          paddingRight: "5px",
          paddingTop: "5px",
          paddingBottom: "5px",
        }}
      >
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
          ref={userToggleRef}
          onClick={toggleUser}
          aria-label="Account"
          aria-expanded={userOpen}
          className="flex items-center justify-center w-9 h-9 rounded-full text-[#e0e0e0]/80 hover:text-white hover:bg-white/[0.06] transition-colors"
          style={{ position: "relative" }}
        >
          <UserIcon />
          {notifications.filter((n) => n.unread).length > 0 && (
            <span
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                minWidth: 15,
                height: 15,
                borderRadius: 999,
                background: "#7F77DD",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontFamily: "monospace",
                fontWeight: "bold",
                lineHeight: 1,
                padding: "0 3px",
                border: "1.5px solid #080808",
              }}
            >
              {notifications.filter((n) => n.unread).length > 9
                ? "9+"
                : notifications.filter((n) => n.unread).length}
            </span>
          )}
        </button>
      </header>

      {/* User panel */}
      {userOpen && (
        <UserPanel
          user={user}
          notifications={notifications}
          onMarkAllRead={markAllRead}
          onClearAll={handleClearAll}
          onClose={() => setUserOpen(false)}
          onSignOut={handleSignOut}
          panelRef={userPanelRef}
          navigate={navigate}
        />
      )}

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
            className="absolute inset-0 flex flex-col items-center gap-3 sm:gap-3 px-3 sm:px-4 pb-6 z-10"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 w-full text-[#cfd2d8] hover:text-white transition-colors text-[13px] sm:text-[14px] font-medium whitespace-nowrap"
                style={{ paddingTop: "8px", paddingBottom: "8px" }}
              >
                <span className="text-[#cfd2d8] flex-shrink-0">
                  {item.icon}
                </span>
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
