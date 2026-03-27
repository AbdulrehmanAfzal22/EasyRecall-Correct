"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  loadFlashcards,
  loadProgress,
  computeStats,
  computeCombinedAccuracy,
  clearProgress,
  saveSession,
} from "@/lib/flashcardStore";
import { loadQuizProgress } from "@/lib/quizStore";
import "./progress.css";

// ══════════════════════════════════════════════════════════════════════════════
//  ALERT POPUP SYSTEM — fully self-contained, no external dependencies
// ══════════════════════════════════════════════════════════════════════════════

const AP_ICONS = {
  confirm: `<polyline points="20 6 9 17 4 12"/>`,
  success: `<polyline points="20 6 9 17 4 12"/>`,
  warning: `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  danger:  `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`,
  error:   `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`,
  info:    `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`,
  prompt:  `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
};

const AP_TOKENS = {
  confirm: { a: "#6366f1", b: "#8b5cf6", glow: "rgba(99,102,241,0.28)"  },
  success: { a: "#10b981", b: "#059669", glow: "rgba(16,185,129,0.28)"  },
  warning: { a: "#f59e0b", b: "#d97706", glow: "rgba(245,158,11,0.28)"  },
  danger:  { a: "#ef4444", b: "#dc2626", glow: "rgba(239,68,68,0.28)"   },
  error:   { a: "#ef4444", b: "#dc2626", glow: "rgba(239,68,68,0.28)"   },
  info:    { a: "#38bdf8", b: "#0284c7", glow: "rgba(56,189,248,0.28)"  },
  prompt:  { a: "#fb923c", b: "#ea580c", glow: "rgba(251,146,60,0.28)"  },
};

const AP_LABELS = {
  confirm: { ok: "Confirm",      cancel: "Cancel"       },
  success: { ok: "Got it",       cancel: null           },
  warning: { ok: "I Understand", cancel: "Go Back"      },
  danger:  { ok: "Yes, Delete",  cancel: "Cancel"       },
  error:   { ok: "OK",           cancel: null           },
  info:    { ok: "OK",           cancel: null           },
  prompt:  { ok: "Submit",       cancel: "Cancel"       },
};

function apClose(overlay, cb) {
  overlay.classList.add("ap-closing");
  overlay.addEventListener("animationend", () => { overlay.remove(); cb?.(); }, { once: true });
}

function apShowPopup({ title, message = "", type = "confirm", inputPlaceholder = "", okLabel, cancelLabel }) {
  return new Promise((resolve) => {
    const tok      = AP_TOKENS[type] || AP_TOKENS.confirm;
    const labels   = AP_LABELS[type] || AP_LABELS.confirm;
    const ok       = okLabel     ?? labels.ok;
    const cancel   = cancelLabel !== undefined ? cancelLabel : labels.cancel;
    const icon     = AP_ICONS[type] || AP_ICONS.confirm;
    const isPrompt = type === "prompt";

    const overlay = document.createElement("div");
    overlay.className = "ap-overlay";
    overlay.innerHTML = `
      <div class="ap-card" style="--ap-type-a:${tok.a};--ap-type-b:${tok.b};--ap-type-glow:${tok.glow};">
        <div class="ap-body">
          <div class="ap-icon-wrap">
            <svg class="ap-icon-svg" viewBox="0 0 24 24">${icon}</svg>
          </div>
          <h2 class="ap-title">${title}</h2>
          ${message  ? `<p class="ap-message">${message}</p>` : ""}
          ${isPrompt ? `<input class="ap-prompt-input" type="text" placeholder="${inputPlaceholder}" autocomplete="off"/>` : ""}
        </div>
        <div class="ap-footer${!cancel ? " ap-footer--single" : ""}">
          ${cancel ? `<button class="ap-btn ap-btn-cancel">${cancel}</button>` : ""}
          <button class="ap-btn ap-btn-confirm" style="--ap-type-a:${tok.a};--ap-type-b:${tok.b};--ap-type-glow:${tok.glow};">${ok}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const confirmBtn = overlay.querySelector(".ap-btn-confirm");
    const cancelBtn  = overlay.querySelector(".ap-btn-cancel");
    const input      = overlay.querySelector(".ap-prompt-input");

    if (input) {
      setTimeout(() => input.focus(), 120);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter")  confirmBtn.click();
        if (e.key === "Escape") (cancelBtn ?? confirmBtn).click();
      });
    }

    const escHandler = (e) => {
      if (e.key !== "Escape") return;
      document.removeEventListener("keydown", escHandler);
      (cancelBtn ?? confirmBtn).click();
    };
    document.addEventListener("keydown", escHandler);

    confirmBtn.addEventListener("click", () => {
      document.removeEventListener("keydown", escHandler);
      apClose(overlay, () => resolve(input ? (input.value.trim() || null) : true));
    });

    cancelBtn?.addEventListener("click", () => {
      document.removeEventListener("keydown", escHandler);
      apClose(overlay, () => resolve(input ? null : false));
    });

    overlay.addEventListener("click", (e) => {
      if (e.target !== overlay) return;
      document.removeEventListener("keydown", escHandler);
      (cancelBtn ?? confirmBtn).click();
    });
  });
}

const popup = {
  alert:   (title, msg, type = "info",    opts = {}) => apShowPopup({ title, message: msg, type, ...opts }),
  confirm: (title, msg, type = "confirm", opts = {}) => apShowPopup({ title, message: msg, type, ...opts }),
  prompt:  (title, msg, ph = "", type = "prompt", opts = {}) =>
    apShowPopup({ title, message: msg, type, inputPlaceholder: ph, ...opts }),
};

// ── Toast system ──────────────────────────────────────────────────────────────

function apToastContainer() {
  let el = document.getElementById("ap-toast-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "ap-toast-container";
    document.body.appendChild(el);
  }
  return el;
}

function apShowToast({ type = "info", title, message, duration = 3500 }) {
  const tok  = AP_TOKENS[type] || AP_TOKENS.info;
  const icon = AP_ICONS[type]  || AP_ICONS.info;
  const el   = document.createElement("div");
  el.className = "ap-toast";
  el.style.cssText = `--ap-type-a:${tok.a};--ap-type-b:${tok.b};--ap-type-glow:${tok.glow};--ap-duration:${duration}ms;`;
  el.innerHTML = `
    <div class="ap-toast-icon"><svg viewBox="0 0 24 24">${icon}</svg></div>
    <div class="ap-toast-content">
      ${title   ? `<div class="ap-toast-title">${title}</div>`   : ""}
      ${message ? `<div class="ap-toast-msg">${message}</div>` : ""}
    </div>
    <button class="ap-toast-close">✕</button>`;
  apToastContainer().appendChild(el);

  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add("ap-toast-out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  };
  const timer = setTimeout(dismiss, duration);
  el.querySelector(".ap-toast-close").addEventListener("click", (e) => { e.stopPropagation(); dismiss(); });
  el.addEventListener("click", dismiss);
}

const toast = {
  success: (t, m, d) => apShowToast({ type: "success", title: t, message: m, duration: d }),
  error:   (t, m, d) => apShowToast({ type: "error",   title: t, message: m, duration: d }),
  warning: (t, m, d) => apShowToast({ type: "warning", title: t, message: m, duration: d }),
  info:    (t, m, d) => apShowToast({ type: "info",    title: t, message: m, duration: d }),
};

// ══════════════════════════════════════════════════════════════════════════════
//  FLASHCARD PROGRESS PAGE
// ══════════════════════════════════════════════════════════════════════════════

const RATING_META = [
  { id: 0, label: "Don't Know",   emoji: "😶", color: "#ef4444", grad: "linear-gradient(135deg,#ef4444,#b91c1c)" },
  { id: 1, label: "A Little Bit", emoji: "🤔", color: "#f59e0b", grad: "linear-gradient(135deg,#f59e0b,#b45309)" },
  { id: 2, label: "Very Well",    emoji: "🎯", color: "#10b981", grad: "linear-gradient(135deg,#10b981,#059669)" },
];

export default function FlashcardProgress() {
  const router = useRouter();
  const [cards,    setCards]    = useState([]);
  const [progress, setProgress] = useState({});
  const [stats,    setStats]    = useState(null);
  const [tab,      setTab]      = useState("overview");

  useEffect(() => {
    const stored = loadFlashcards();
    const prog   = loadProgress();
    const quizProg = loadQuizProgress();
    
    if (stored?.cards) {
      setCards(stored.cards);
      setProgress(prog);
      const computed = computeStats(stored.cards, prog);
      const combined = computeCombinedAccuracy(computed, quizProg);
      // Add combined accuracy to stats object
      setStats({ ...computed, combinedAccuracy: combined });
    }
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleReset = async () => {
    const confirmed = await popup.confirm(
      "Reset All Progress",
      "This will permanently erase <strong>all</strong> your flashcard ratings and history. This cannot be undone.",
      "danger",
      { okLabel: "Yes, Reset Everything", cancelLabel: "Keep My Progress" }
    );
    if (!confirmed) return;
    clearProgress();
    const fresh = {};
    setProgress(fresh);
    setStats(computeStats(cards, fresh));
    toast.info("Progress Reset", "All flashcard ratings have been cleared.");
  };

  const handleRestart = async () => {
    const confirmed = await popup.confirm(
      "Restart Session",
      "Your progress ratings will be kept, but your session position will reset to the first card.",
      "warning",
      { okLabel: "Restart Session", cancelLabel: "Stay Here" }
    );
    if (!confirmed) return;
    clearProgress();
    saveSession(0);
    toast.success("Session Restarted!", "Starting fresh from card 1. Good luck! 💪");
    setTimeout(() => router.push("/page/dashboard/flashcard"), 700);
  };

  const handleUploadNew = async () => {
    const confirmed = await popup.confirm(
      "Upload New Content?",
      "You'll be taken to Content Intake. Your current flashcard progress will remain saved.",
      "info",
      { okLabel: "Go to Content Intake", cancelLabel: "Stay Here" }
    );
    if (!confirmed) return;
    router.push("/page/dashboard/content-intake");
  };

  const handleStartStudying = () => {
    toast.info("Let's go! 💪", "Redirecting to your flashcards...");
    setTimeout(() => router.push("/page/dashboard/flashcard"), 450);
  };

  const handleBackToCards = () => {
    router.push("/page/dashboard/flashcard");
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!stats) return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Progress</h1><p>Your learning journey</p></div>
      </div>
      <div className="page fcp-empty-page">
        <div className="fcp-empty-card">
          <span className="fcp-empty-icon">📊</span>
          <h2>No data yet</h2>
          <p>Complete some flashcard reviews to see your progress here.</p>
          <button className="fcp-cta-btn" onClick={handleStartStudying}>
            Start Studying →
          </button>
        </div>
      </div>
    </>
  );

  const scoreColor =
    stats.combinedAccuracy >= 70 ? "#10b981" :
    stats.combinedAccuracy >= 40 ? "#f59e0b" :
    "#ef4444";

  const circumference = 2 * Math.PI * 52;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Progress</h1>
          <p>{stats.seen} of {stats.total} cards reviewed · {stats.mastered} mastered</p>
        </div>
        <div className="topbar-right">
          <button className="fcp-ghost-btn" onClick={handleBackToCards}>
            ← Back to Cards
          </button>
        </div>
      </div>

      <div className="page fcp-page">

        {/* ── Score ring + stat chips ── */}
        <div className="fcp-hero">
          <div className="fcp-ring-wrap">
            <svg viewBox="0 0 120 120" className="fcp-ring-svg">
              <circle cx="60" cy="60" r="52" className="fcp-ring-track" />
              <circle
                cx="60" cy="60" r="52"
                className="fcp-ring-fill"
                style={{
                  stroke: scoreColor,
                  strokeDasharray: circumference,
                  strokeDashoffset: circumference * (1 - stats.combinedAccuracy / 100),
                }}
              />
            </svg>
            <div className="fcp-ring-inner">
              <div className="fcp-ring-pct" style={{ color: scoreColor }}>{stats.combinedAccuracy}%</div>
              <div className="fcp-ring-tag">overall accuracy</div>
            </div>
          </div>

          <div className="fcp-stat-grid">
            <div className="fcp-stat">
              <span className="fcp-stat-num">{stats.total}</span>
              <span className="fcp-stat-label">Total cards</span>
            </div>
            <div className="fcp-stat">
              <span className="fcp-stat-num">{stats.seen}</span>
              <span className="fcp-stat-label">Reviewed</span>
            </div>
            <div className="fcp-stat">
              <span className="fcp-stat-num">{stats.unseen}</span>
              <span className="fcp-stat-label">Remaining</span>
            </div>
            <div className="fcp-stat fcp-stat--highlight">
              <span className="fcp-stat-num" style={{ color: "#10b981" }}>{stats.mastered}</span>
              <span className="fcp-stat-label">Mastered</span>
            </div>
          </div>
        </div>

        {/* ── Mastery bar ── */}
        <div className="fcp-section">
          <div className="fcp-section-header">
            <span className="fcp-section-title">Mastery Breakdown</span>
            <span className="fcp-mastery-pct">{stats.masteryPct}% of all cards mastered</span>
          </div>
          <div className="fcp-bar">
            {RATING_META.map((r) => {
              const count = stats.counts[r.id] || 0;
              const pct   = stats.total === 0 ? 0 : (count / stats.total) * 100;
              return (
                <div
                  key={r.id}
                  className="fcp-bar-seg"
                  style={{ width: `${pct}%`, background: r.grad }}
                  title={`${r.label}: ${count}`}
                />
              );
            })}
            <div
              className="fcp-bar-seg fcp-bar-seg--unseen"
              style={{ width: `${(stats.unseen / stats.total) * 100}%` }}
              title={`Unseen: ${stats.unseen}`}
            />
          </div>
          <div className="fcp-legend">
            {RATING_META.map((r) => (
              <div key={r.id} className="fcp-legend-item">
                <div className="fcp-legend-dot" style={{ background: r.color }} />
                <span>{r.label}: <strong>{stats.counts[r.id] || 0}</strong></span>
              </div>
            ))}
            <div className="fcp-legend-item">
              <div className="fcp-legend-dot fcp-legend-dot--unseen" />
              <span>Unseen: <strong>{stats.unseen}</strong></span>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="fcp-tabs">
          <button
            className={`fcp-tab ${tab === "overview" ? "fcp-tab--active" : ""}`}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            className={`fcp-tab ${tab === "breakdown" ? "fcp-tab--active" : ""}`}
            onClick={() => setTab("breakdown")}
          >
            All Cards
          </button>
        </div>

        {/* ── Overview cards ── */}
        {tab === "overview" && (
          <div className="fcp-overview-grid">
            {RATING_META.map((r) => {
              const count = stats.counts[r.id] || 0;
              const pct   = stats.seen === 0 ? 0 : Math.round((count / stats.seen) * 100);
              return (
                <div key={r.id} className="fcp-ov-card" style={{ "--rc": r.color }}>
                  <div className="fcp-ov-top-bar" style={{ background: r.grad }} />
                  <div className="fcp-ov-emoji">{r.emoji}</div>
                  <div className="fcp-ov-count">{count}</div>
                  <div className="fcp-ov-label">{r.label}</div>
                  <div className="fcp-ov-sub">{pct}% of reviewed</div>
                  <div className="fcp-ov-mini-bar">
                    <div style={{ width: `${pct}%`, background: r.color, height: "100%", borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Card breakdown ── */}
        {tab === "breakdown" && (
          <div className="fcp-breakdown">
            {cards.map((card, i) => {
              const p     = progress[i];
              const rMeta = p ? RATING_META[p.rating] : null;
              return (
                <div key={i} className="fcp-card-row">
                  <span className="fcp-row-num">{i + 1}</span>
                  <span className="fcp-row-q">{card.question}</span>
                  <span
                    className="fcp-row-badge"
                    style={rMeta
                      ? { color: rMeta.color, background: `${rMeta.color}18`, borderColor: `${rMeta.color}40` }
                      : {}
                    }
                  >
                    {rMeta ? `${rMeta.emoji} ${rMeta.label}` : "— Unseen"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="fcp-actions">
          <button className="fcp-action-btn fcp-action-btn--primary" onClick={handleRestart}>
            ↺ Restart Session
          </button>
          <button className="fcp-action-btn fcp-action-btn--ghost" onClick={handleReset}>
            🗑 Reset Progress
          </button>
          <button className="fcp-action-btn fcp-action-btn--ghost" onClick={handleUploadNew}>
            ↑ Upload New Content
          </button>
        </div>

      </div>
    </>
  );
}