"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import {
  loadFlashcards,
  loadProgress,
  saveRating,
  saveSession,
  loadSession,
  computeStats,
} from "../../../../lib/flashcardStore";
import "./flashcard.css";

const RATINGS = [
  {
    id:     0,
    label:  "Don't Know",
    emoji:  "😶",
    color:  "#ef4444",
    bg:     "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
  },
  {
    id:     1,
    label:  "A Little Bit",
    emoji:  "🤔",
    color:  "#f59e0b",
    bg:     "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
  },
  {
    id:     2,
    label:  "Very Well!",
    emoji:  "🎯",
    color:  "#10b981",
    bg:     "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
  },
];

export default function FlashcardPage() {
  const router = useRouter();

  const [cards,      setCards]      = useState([]);
  const [index,      setIndex]      = useState(0);
  const [flipped,    setFlipped]    = useState(false);
  const [progress,   setProgress]   = useState({});
  const [rated,      setRated]      = useState(false);
  const [lastRating, setLastRating] = useState(null);
  const [sliding,    setSliding]    = useState(false);

  // ─── load on mount ────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const stored = await loadFlashcards();
      if (stored?.cards?.length) {
        setCards(stored.cards);
        const savedIdx = loadSession();
        setIndex(Math.min(savedIdx, stored.cards.length - 1));
      }
      setProgress(loadProgress());
    })();
  }, []);

  // ─── navigation ───────────────────────────────────────────────────────────

  const navigate = useCallback((dir) => {
    const next = index + dir;
    if (next < 0 || next >= cards.length) return;
    setSliding(true);
    setTimeout(() => {
      setIndex(next);
      saveSession(next);
      setFlipped(false);
      setRated(false);
      setLastRating(null);
      setSliding(false);
    }, 280);
  }, [index, cards.length]);

  // ─── rating ───────────────────────────────────────────────────────────────

  const handleRate = (ratingId) => {
    const updated = saveRating(index, ratingId);
    setProgress(updated);
    setRated(true);
    setLastRating(ratingId);
  };

  // ─── empty state ─────────────────────────────────────────────────────────

  if (cards.length === 0) {
    return (
      <>
        <div className="topbar">
          <div className="topbar-left">
            <h1>Flashcards</h1>
            <p>Study · review · master</p>
          </div>
        </div>
        <div className="page fc-empty-page">
          <div className="fc-empty-card">
            <div className="fc-empty-icon"><RotateCcw size={48} /></div>
            <h2>No flashcards yet</h2>
            <p>Generate flashcards from the Content Intake page first.</p>
            <button
              className="ci-btn ci-primary"
              onClick={() => router.push("/page/dashboard/content-intake")}
            >
              Go to Content Intake →
            </button>
          </div>
        </div>
      </>
    );
  }

  const card      = cards[index];
  const stats     = computeStats(cards, progress);
  const cardProg  = progress[index];
  const ratingObj = lastRating !== null ? RATINGS[lastRating] : cardProg ? RATINGS[cardProg.rating] : null;
  const pct       = Math.round(((index + 1) / cards.length) * 100);

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Flashcards</h1>
          <p>
            Card {index + 1} of {cards.length} ·{" "}
            <span style={{ color: "#a78bfa" }}>{stats.mastered} mastered</span>
          </p>
        </div>
        <div className="topbar-right">
          <button
            className="ci-btn ci-ghost ci-btn-sm"
            onClick={() => router.push("/page/dashboard/progress-flashcard")}
          >
            Progress
          </button>
        </div>
      </div>

      <div className="page fc-page">

        {/* ── Progress bar + dots ── */}
        <div className="fc-header-bar">
          <div className="fc-progress-wrap">
            <div className="fc-progress-track">
              <div className="fc-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="fc-pct-label">{pct}%</span>
          </div>
          <div className="fc-dots-row">
            {cards.map((_, i) => {
              const p = progress[i];
              const color = p
                ? ["#ef4444", "#f59e0b", "#10b981"][p.rating]
                : i === index
                  ? "var(--fc-dot-active)"
                  : "var(--fc-dot-inactive)";
              return (
                <button
                  key={i}
                  className={`fc-dot ${i === index ? "fc-dot--active" : ""}`}
                  style={{ background: color }}
                  onClick={() => navigate(i - index)}
                  title={`Card ${i + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* ── Card ── */}
        <div className={`fc-scene ${sliding ? "fc-scene--sliding" : ""}`}>
          <div className="fc-wrapper fc-wrapper--page">
            <div className={`fc-card ${flipped ? "is-flipped" : ""}`}>

              {/* FRONT */}
              <div className="fc-front">
                <div>
                  <p className="fc-label">Question {index + 1}</p>
                  <h2 className="fc-title">{card.question}</h2>
                </div>
                <button className="fc-button" onClick={() => setFlipped(true)}>
                  Reveal Answer ↓
                </button>
              </div>

              {/* BACK */}
              <div className="fc-back">
                <div>
                  <p className="fc-label">Answer</p>
                  <h2 className="fc-title fc-title--answer">{card.answer}</h2>
                </div>
                <button
                  className="fc-button"
                  onClick={() => { setFlipped(false); setRated(false); setLastRating(null); }}
                >
                  ↺ Question
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ── Rating buttons — visible after flip ── */}
        <div className={`fc-ratings-block ${flipped ? "fc-ratings-block--visible" : ""}`}>
          <p className="fc-ratings-heading">How well did you know this?</p>
          <div className="fc-ratings-row">
            {RATINGS.map((r) => (
              <button
                key={r.id}
                className={`fc-rate-btn
                  ${rated && lastRating === r.id ? "fc-rate-btn--selected" : ""}
                  ${rated && lastRating !== r.id ? "fc-rate-btn--faded"    : ""}
                `}
                style={{ "--rc": r.color, "--rbg": r.bg, "--rbd": r.border }}
                onClick={() => handleRate(r.id)}
              >
                <span className="fc-rate-emoji">{r.emoji}</span>
                <span className="fc-rate-label">{r.label}</span>
              </button>
            ))}
          </div>

          {rated && (
            <div className="fc-post-rate-row">
              <span className="fc-rated-badge" style={{ color: ratingObj?.color }}>
                <span style={{ display: "inline-block", marginRight: "6px" }}>{ratingObj?.emoji}</span>
                Marked as "{ratingObj?.label}"
              </span>
              {index < cards.length - 1 ? (
                <button className="ci-btn ci-primary ci-btn-sm" onClick={() => navigate(1)}>
                  Next →
                </button>
              ) : (
                <button
                  className="ci-btn ci-primary ci-btn-sm"
                  onClick={() => router.push("/page/dashboard/progress-flashcard")}
                >
                  View Results →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Nav arrows ── */}
        <div className="fc-nav-row">
          <button className="fc-nav-btn" onClick={() => navigate(-1)} disabled={index === 0}>
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            className="fc-nav-btn"
            onClick={() => navigate(1)}
            disabled={index === cards.length - 1}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </>
  );
}