"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Layers, BrainCircuit,
  ClipboardList, BarChart2, HelpCircle,
  ChevronLeft, ChevronRight, Sun, Moon,
  LogOut, ChevronUp, MessageCircle
} from "lucide-react";
import { useAuth } from "../../AuthProvider";
import "./sidebar.css";
import Image from "next/image";
import logo from "../../../../public/assets/logo.png"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/page/dashboard/dash-home", icon: LayoutDashboard },
  { label: "Documents", href: "/page/dashboard/content-intake", icon: FileText },
  { label: "Flashcard Decks", href: "/page/dashboard/flashcard", icon: Layers },
  { label: "Flashcard Progress", href: "/page/dashboard/progress-flashcard", icon: BarChart2 },
  { label: "Quizzes", href: "/page/dashboard/quiz", icon: BrainCircuit },
  { label: "Content", href: "/page/dashboard/documents", icon: ClipboardList },
  { label: "Segments", href: "/page/dashboard/segments", icon: HelpCircle },
  { label: "Chat with AI", href: "/page/dashboard/chat-ai", icon: MessageCircle },
];

export default function Sidebar({ isDark, onToggleTheme }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const menuRef = useRef(null);

  const [collapsed, setCollapsed] = useState(
    typeof window !== "undefined" && window.innerWidth <= 900
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error(err);
      setLoggingOut(false);
    }
  };

  // KEY FUNCTION: Handle profile click - expand sidebar if collapsed
  const handleProfileClick = () => {
    if (collapsed) {
      setCollapsed(false); // Expand sidebar first
      // Small delay to allow animation, then open menu
      setTimeout(() => setMenuOpen(true), 150);
    } else {
      setMenuOpen((p) => !p); // Just toggle menu if already expanded
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const photoURL = user?.photoURL;
  const initials = displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>

      {/* ── Logo / Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Image src={logo} alt="EasyRecall Logo" className="sidebar-logo" />
        </div>
        {!collapsed && <span className="sidebar-brand-name">EasyRecall</span>}
      </div>

      {/* ── Top row: theme + collapse ── */}
      <div className="sidebar-top-row">
        <button className="sidebar-icon-btn" onClick={onToggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="sidebar-icon-btn" onClick={() => setCollapsed((p) => !p)} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ── Nav label ── */}
      {!collapsed && <p className="sidebar-section-label">Menu</p>}

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-link${pathname === href ? " active" : ""}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} className="sidebar-icon" />
            {!collapsed && <span className="sidebar-label">{label}</span>}
          </Link>
        ))}
      </nav>

      {/* ── Decorative filler — fills the empty middle space ── */}
      <div className="sidebar-filler" aria-hidden="true">
        {!collapsed && (
          <div className="sidebar-filler-orb" />
        )}
      </div>

      {/* ── Divider ── */}
      <div className="sidebar-divider" />

      {/* ── User profile ── */}
      {user && (
        <div className="sidebar-profile-wrap" ref={menuRef}>
          {/* Profile Menu (only shows when expanded) */}
          {menuOpen && !collapsed && (
            <div className="sidebar-profile-menu">
              <div className="spm-user-header">
                <div className="spm-avatar-lg">
                  {photoURL
                    ? <img src={photoURL} alt={displayName} referrerPolicy="no-referrer" />
                    : <span>{initials}</span>}
                </div>
                <div>
                  <div className="spm-name">{displayName}</div>
                  <div className="spm-email">{email}</div>
                </div>
              </div>
              <div className="spm-divider" />
              <button className="spm-item spm-item--logout" onClick={handleLogout} disabled={loggingOut}>
                <LogOut size={15} />
                <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
              </button>
            </div>
          )}

          {/* Profile Trigger Button */}
          <button
            className={`sidebar-profile ${collapsed ? "sidebar-profile--collapsed" : ""}`}
            onClick={handleProfileClick}
            title={collapsed ? `${displayName} — click to expand` : undefined}
            aria-expanded={menuOpen}
          >
            <div className="sp-avatar">
              {photoURL
                ? <img src={photoURL} alt={displayName} className="sp-avatar-img" referrerPolicy="no-referrer" />
                : <span className="sp-avatar-initials">{initials}</span>}
              <span className="sp-online-dot" />
            </div>
            {!collapsed && (
              <>
                <div className="sp-info">
                  <span className="sp-name">{displayName}</span>
                  <span className="sp-email">{email}</span>
                </div>
                <ChevronUp size={14} className={`sp-chevron ${menuOpen ? "sp-chevron--open" : ""}`} />
              </>
            )}
          </button>

          {/* Collapsed state mini menu (optional - shows logout only) */}
          {collapsed && menuOpen && (
            <div className="sidebar-profile-menu sidebar-profile-menu--collapsed">
              <button className="spm-item spm-item--logout" onClick={handleLogout} disabled={loggingOut}>
                <LogOut size={15} />
                <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}