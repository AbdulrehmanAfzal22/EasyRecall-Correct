"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Search,
  FolderOpen,
  MapPin,
  Lightbulb,
  Key,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { loadSegments } from "../../../../lib/segmentStore";
import "./segment.css";

// ── Segment type config ────────────────────────────────────────────────────
const TYPES = {
  topic: {
    label: "Topic",
    emoji: "📌",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.09)",
    border: "rgba(99,102,241,0.22)",
    icon: MapPin,
  },
  concept: {
    label: "Concept",
    emoji: "💡",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.09)",
    border: "rgba(139,92,246,0.22)",
    icon: Lightbulb,
  },
  statement: {
    label: "Key Statement",
    emoji: "🔑",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.09)",
    border: "rgba(14,165,233,0.22)",
    icon: Key,
  },
  fact: {
    label: "Fact",
    emoji: "📊",
    color: "#10b981",
    bg: "rgba(16,185,129,0.09)",
    border: "rgba(16,185,129,0.22)",
    icon: BarChart3,
  },
  definition: {
    label: "Definition",
    emoji: "📖",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.09)",
    border: "rgba(245,158,11,0.22)",
    icon: BookOpen,
  },
};

// ── Segment card ───────────────────────────────────────────────────────────
function SegmentCard({ seg, index }) {
  const [open, setOpen] = useState(false);
  const cfg = TYPES[seg.type] || TYPES.topic;
  return (
    <div
      className="cs-seg-card"
      style={{ "--sc": cfg.color, "--sc-bg": cfg.bg, "--sc-border": cfg.border, animationDelay: `${index * 55}ms` }}
      onClick={() => setOpen(o => !o)}
    >
      <div className="cs-seg-row">
        <span
          className="cs-seg-type-tag"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
          <span
            style={{
              display: "inline-block",
              marginRight: "4px",
              verticalAlign: "text-bottom",
            }}
          >
            {cfg.emoji}
          </span>
          {cfg.label}
        </span>
        <h4 className="cs-seg-title">{seg.title}</h4>
        <span className={`cs-seg-chevron${open ? " open" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </span>
      </div>
      {open && (
        <div className="cs-seg-body">
          <p className="cs-seg-text">{seg.content}</p>
          {seg.keywords?.length > 0 && (
            <div className="cs-keywords">
              {seg.keywords.map(kw => (
                <span key={kw} className="cs-kw" style={{ "--kc": cfg.color }}>{kw}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Group panel ────────────────────────────────────────────────────────────
function GroupPanel({ group, index, defaultOpen }) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const typeCounts = useMemo(() =>
    group.segments.reduce((acc, s) => ({ ...acc, [s.type]: (acc[s.type] || 0) + 1 }), {}),
    [group.segments]
  );

  return (
    <div className="cs-group" style={{ animationDelay: `${index * 90}ms` }}>
      <div className="cs-group-hd" onClick={() => setCollapsed(c => !c)}>
        <div className="cs-group-hd-left">
          <div className="cs-group-num">{index + 1}</div>
          <div>
            <div className="cs-group-name">{group.title}</div>
            <div className="cs-group-sub">{group.segments.length} units</div>
          </div>
        </div>
        <div className="cs-group-hd-right">
          <div className="cs-group-pills">
            {Object.entries(typeCounts).map(([type, count]) => {
              const IconComp = TYPES[type]?.icon || null;
              return (
                <span
                  key={type}
                  className="cs-group-pill"
                  style={{ color: TYPES[type]?.color, background: TYPES[type]?.bg }}
                >
                  {IconComp && (
                    <IconComp
                      size={12}
                      style={{
                        display: "inline-block",
                        marginRight: "4px",
                        verticalAlign: "text-bottom",
                      }}
                    />
                  )}
                  {count}
                </span>
              );
            })}
          </div>
          <span className={`cs-group-toggle${collapsed ? " collapsed" : ""}`}>
            <ChevronDown size={13} style={{ strokeWidth: 2.5 }} />
          </span>
        </div>
      </div>
      {!collapsed && (
        <div className="cs-group-body">
          {group.segments.map((seg, i) => <SegmentCard key={seg.id} seg={seg} index={i} />)}
        </div>
      )}
    </div>
  );
}

// ── Stat chip ──────────────────────────────────────────────────────────────
function Stat({ icon: Icon, value, label, color }) {
  return (
    <div className="cs-stat" style={{ "--sc": color }}>
      <span className="cs-stat-val">{value}</span>
      <span className="cs-stat-label">
        {Icon && (
          <Icon
            size={14}
            style={{
              display: "inline-block",
              marginRight: "4px",
              verticalAlign: "text-bottom",
            }}
          />
        )}
        {label}
      </span>
    </div>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────────
function TopBar({ darkMode, onToggle }) {
  const router = useRouter();
  return (
    <div className="cs-topbar">
      <div className="cs-topbar-left">
        <button className="cs-back-btn" onClick={() => router.back()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
     
      </div>
 
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ContentSegmentsPage() {
  const router = useRouter();
  const [data, setData]         = useState(null);
  const [loaded, setLoaded]     = useState(false);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const stored = loadSegments();
    setData(stored);
    setLoaded(true);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];
    return data.groups
      .map(g => ({
        ...g,
        segments: g.segments.filter(s => {
          const typeOk   = filter === "all" || s.type === filter;
          const q        = search.trim().toLowerCase();
          const searchOk = !q ||
            s.title.toLowerCase().includes(q)   ||
            s.content.toLowerCase().includes(q) ||
            s.keywords?.some(k => k.toLowerCase().includes(q));
          return typeOk && searchOk;
        }),
      }))
      .filter(g => g.segments.length > 0);
  }, [data, filter, search]);

  if (!loaded) return null;

  const stats   = data?.stats ?? {};
  const allSegs = data?.groups?.flatMap(g => g.segments) ?? [];

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className={`cs-root${darkMode ? " dark" : ""}`}>
        <TopBar darkMode={darkMode} onToggle={() => setDarkMode(d => !d)} />
        <div className="cs-page">
          <div className="cs-empty-state">
            <div className="cs-empty-orbs">
              <div className="cs-empty-orb cs-empty-orb--1" />
              <div className="cs-empty-orb cs-empty-orb--2" />
            </div>
            <span className="cs-empty-icon">📭</span>
            <h2 className="cs-empty-title">No segments yet</h2>
            <p className="cs-empty-sub">
              Upload content in Content Intake first.<br />
              Segments are extracted automatically alongside your flashcards and quiz.
            </p>
            <button className="cs-empty-cta" onClick={() => router.push("/page/dashboard/content-intake")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <path d="M12 4v12M6 10l6-6 6 6"/><path d="M4 20h16"/>
              </svg>
              Go to Content Intake
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────
  return (
    <div className={`cs-root${darkMode ? " dark" : ""}`}>
      <TopBar darkMode={darkMode} onToggle={() => setDarkMode(d => !d)} />

      <div className="cs-page">

        {/* Source badge + title */}
        <div className="cs-page-header">
          <div className="cs-source-tag">
            <span>📄</span>
            <span className="cs-source-name" title={data.fileNames}>{data.fileNames}</span>
            {stats.wordCount > 0 && (
              <span className="cs-source-words">{stats.wordCount.toLocaleString()} words</span>
            )}
          </div>
          <h1 className="cs-page-title">Content Segments</h1>
          <p className="cs-page-sub">
            Your content broken down into logical topics, concepts, key statements, facts and definitions.
          </p>
        </div>

        {/* Stats strip */}
        <div className="cs-stats-strip">
          <Stat icon={FolderOpen}  value={stats.totalSegments ?? allSegs.length} label="Total"       color="#6366f1" />
          <span className="cs-stats-sep" />
          <Stat icon={MapPin}  value={stats.topics      ?? 0}  label="Topics"       color="#6366f1" />
          <Stat icon={Lightbulb} value={stats.concepts    ?? 0}  label="Concepts"     color="#8b5cf6" />
          <Stat icon={Key}  value={stats.statements  ?? 0}  label="Statements"   color="#0ea5e9" />
          <Stat icon={BarChart3}       value={stats.facts       ?? 0}  label="Facts"        color="#10b981" />
          <Stat icon={BookOpen}  value={stats.definitions ?? 0}  label="Definitions"  color="#f59e0b" />
        </div>

        {/* Search + filter toolbar */}
        <div className="cs-toolbar">
          <div className="cs-search-wrap">
            <Search size={14} className="cs-search-ico" />
            <input
              className="cs-search"
              placeholder="Search segments, keywords…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="cs-search-clear" onClick={() => setSearch("")}>✕</button>
            )}
          </div>

          <div className="cs-chips">
            {[["all", "All", "#6366f1"], ...Object.entries(TYPES).map(([k, v]) => [k, v.label, v.color])].map(([key, label, color]) => (
              <button
                key={key}
                className={`cs-chip${filter === key ? " cs-chip--on" : ""}`}
                style={{ "--cc": color }}
                onClick={() => setFilter(key)}
              >
                {key !== "all" ? TYPES[key]?.emoji + " " : ""}{label}
              </button>
            ))}
          </div>
        </div>

        {/* No match */}
        {filteredGroups.length === 0 ? (
          <div className="cs-no-match">
            <span>🔍</span>
            <p>No segments match.</p>
            <button className="cs-reset-btn" onClick={() => { setFilter("all"); setSearch(""); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="cs-groups">
            {filteredGroups.map((group, i) => (
              <GroupPanel key={group.id} group={group} index={i} defaultOpen={i === 0} />
            ))}
          </div>
        )}

        {/* Footer nav */}
        <div className="cs-footer">
          <button className="cs-footer-btn" onClick={() => router.push("/page/dashboard/content-intake")}>
            ↩ New content
          </button>
          <button className="cs-footer-btn" onClick={() => router.push("/page/dashboard/flashcard")}>
            🃏 Flashcards
          </button>
          <button className="cs-footer-btn" onClick={() => router.push("/page/dashboard/quiz")}>
            📝 Quiz
          </button>
        </div>
      </div>
    </div>
  );
}