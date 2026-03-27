"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  loadQuiz,
  loadQuizProgress,
  saveMCQAnswer,
  saveTFAnswer,
  saveSAAnswer,
  computeQuizStats,
  clearQuizProgress,
} from "@/lib/quizStore";
import "./quiz.css";
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
  danger:  { ok: "Delete",       cancel: "Cancel"       },
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
    const tok    = AP_TOKENS[type]  || AP_TOKENS.confirm;
    const labels = AP_LABELS[type]  || AP_LABELS.confirm;
    const ok     = okLabel     ?? labels.ok;
    const cancel = cancelLabel !== undefined ? cancelLabel : labels.cancel;
    const icon   = AP_ICONS[type]  || AP_ICONS.confirm;
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

// Toast system
function apToastContainer() {
  let el = document.getElementById("ap-toast-container");
  if (!el) { el = document.createElement("div"); el.id = "ap-toast-container"; document.body.appendChild(el); }
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
//  QUIZ PAGE
// ══════════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  { id: "mcq", label: "Multiple Choice", icon: "📝", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  { id: "tf",  label: "True / False",    icon: "✓✗",  color: "#38bdf8", bg: "rgba(56,189,248,0.1)"  },
  { id: "sa",  label: "Short Answer",    icon: "💬",  color: "#fb923c", bg: "rgba(251,146,60,0.1)"  },
];

function scoreShortAnswer(userAnswer, keyPoints) {
  if (!userAnswer.trim()) return 0;
  const ua   = userAnswer.toLowerCase();
  const hits = keyPoints.filter((kp) => {
    const words = kp.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return words.some((w) => ua.includes(w));
  });
  return Math.round((hits.length / Math.max(keyPoints.length, 1)) * 100);
}

export default function QuizPage() {
  const router = useRouter();

  const [quiz,      setQuiz]      = useState(null);
  const [progress,  setProgress]  = useState({ mcq: {}, tf: {}, sa: {} });
  const [stats,     setStats]     = useState(null);
  const [activeTab, setActiveTab] = useState("mcq");
  const [saInputs,  setSaInputs]  = useState({});
  const [revealed,  setRevealed]  = useState({});
  const [animate,   setAnimate]   = useState(null);
  const [started,   setStarted]   = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const stored = loadQuiz();
    const prog   = loadQuizProgress();
    if (stored?.quiz) {
      setQuiz(stored.quiz);
      setProgress(prog);
      setStats(computeQuizStats(stored.quiz, prog));
      const hasProgress =
        Object.keys(prog.mcq).length > 0 ||
        Object.keys(prog.tf).length  > 0 ||
        Object.keys(prog.sa).length  > 0;
      if (hasProgress) setStarted(true);
    }
  }, []);

  // ── Derived totals ────────────────────────────────────────────────────────

  const mcqTotal = quiz?.mcq?.length         || 0;
  const tfTotal  = quiz?.trueFalse?.length   || 0;
  const saTotal  = quiz?.shortAnswer?.length || 0;
  const total    = mcqTotal + tfTotal + saTotal;
  const mcqDone  = Object.keys(progress.mcq).length;
  const tfDone   = Object.keys(progress.tf).length;
  const saDone   = Object.keys(progress.sa).length;
  const answered = mcqDone + tfDone + saDone;

  // ── Answer handlers ───────────────────────────────────────────────────────

  const handleMCQ = (q, selected) => {
    if (progress.mcq[q.id]) return;
    const correct = selected.startsWith(q.correct);
    const updated = saveMCQAnswer(q.id, selected, correct);
    setProgress(updated);
    setStats(computeQuizStats(quiz, updated));
    setAnimate(q.id);
    correct
      ? toast.success("Correct! 🎉", "Great job — keep it up!")
      : toast.error("Incorrect", "Check the explanation below.");
  };

  const handleTF = (q, selected) => {
    if (progress.tf[q.id] !== undefined) return;
    const correct = selected === q.correct;
    const updated = saveTFAnswer(q.id, selected, correct);
    setProgress(updated);
    setStats(computeQuizStats(quiz, updated));
    setAnimate(q.id);
    correct
      ? toast.success("That's right!", "Nice work on that one.")
      : toast.error("Not quite", "Check the explanation below.");
  };

  const handleSASubmit = (q) => {
    const answer = (saInputs[q.id] || "").trim();
    if (!answer || progress.sa[q.id]) return;
    const score   = scoreShortAnswer(answer, q.keyPoints || []);
    const updated = saveSAAnswer(q.id, answer, score);
    setProgress(updated);
    setStats(computeQuizStats(quiz, updated));
    setRevealed((prev) => ({ ...prev, [q.id]: true }));
    setAnimate(q.id);
    if      (score >= 75) toast.success(`Score: ${score}%`, "Excellent! You nailed the key points.");
    else if (score >= 40) toast.warning(`Score: ${score}%`, "Partial credit — review missed key points.");
    else                  toast.error(`Score: ${score}%`,   "Review the model answer below.");
  };

  const handleReset = async () => {
    const confirmed = await popup.confirm(
      "Reset Quiz Progress",
      "This will erase <strong>all</strong> your answers and scores. This cannot be undone.",
      "danger",
      { okLabel: "Yes, Reset Everything", cancelLabel: "Keep My Progress" }
    );
    if (!confirmed) return;
    clearQuizProgress();
    const fresh = { mcq: {}, tf: {}, sa: {} };
    setProgress(fresh);
    setRevealed({});
    setSaInputs({});
    setStats(computeQuizStats(quiz, fresh));
    setStarted(false);
    toast.info("Progress Reset", "All answers cleared. Start fresh!");
  };

  // ── Completion popup ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!quiz || !started || total === 0 || answered !== total) return;
    const score  = stats?.overallScore ?? 0;
    const type   = score >= 70 ? "success" : score >= 40 ? "warning" : "info";
    const title  = score >= 70 ? "🎉 Quiz Complete!" : "Quiz Finished";
    const mcqAcc = mcqDone ? Math.round(Object.values(progress.mcq).filter(v=>v.correct).length / mcqDone * 100) : 0;
    const tfAcc  = tfDone  ? Math.round(Object.values(progress.tf).filter(v=>v.correct).length  / tfDone  * 100) : 0;
    const saAvg  = saDone  ? Math.round(Object.values(progress.sa).reduce((a,v)=>a+(v.score||0),0) / saDone)     : 0;
    setTimeout(() =>
      popup.alert(title,
        `You scored <strong>${score}%</strong> overall.<br/>MCQ: ${mcqAcc}% &nbsp;·&nbsp; T/F: ${tfAcc}% &nbsp;·&nbsp; SA: ${saAvg}%`,
        type,
        { okLabel: score >= 70 ? "Celebrate! 🥳" : "Review Answers" }
      ), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, total]);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!quiz) return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Quiz</h1><p>Test your knowledge</p></div>
      </div>
      <div className="page qz-empty-page">
        <div className="qz-empty-card">
          <span className="qz-empty-icon">🧠</span>
          <h2>No quiz yet</h2>
          <p>Upload study material from Content Intake to generate a quiz automatically.</p>
          <button className="qz-cta-btn" onClick={() => router.push("/page/dashboard/content-intake")}>
            Go to Content Intake →
          </button>
        </div>
      </div>
    </>
  );

  // ── Ready screen ──────────────────────────────────────────────────────────

  if (!started) return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1>Quiz</h1><p>Your quiz is ready</p></div>
      </div>
      <div className="page qz-empty-page">
        <div className="qz-ready-card">
          <div className="qz-ready-icon">✨</div>
          <h2 className="qz-ready-title">Quiz Ready!</h2>
          <p className="qz-ready-subtitle">{total} questions generated and ready to test your knowledge</p>
          <div className="qz-ready-breakdown">
            {[
              { icon: "📝", label: "Multiple Choice", count: mcqTotal },
              { icon: "✓✗", label: "True / False",    count: tfTotal  },
              { icon: "💬", label: "Short Answer",    count: saTotal  },
            ].map((s) => (
              <div key={s.label} className="qz-ready-stat">
                <span className="qz-rs-icon">{s.icon}</span>
                <span className="qz-rs-label">{s.label}</span>
                <span className="qz-rs-count">{s.count} questions</span>
              </div>
            ))}
          </div>
          <button
            className="qz-cta-btn qz-start-btn"
            onClick={() => { setStarted(true); toast.info("Quiz Started!", "Good luck — you've got this! 💪"); }}
          >
            Start Quiz →
          </button>
          <button className="qz-secondary-link" onClick={() => router.push("/page/dashboard/flashcard")}>
            🃏 Study Flashcards First
          </button>
        </div>
      </div>
    </>
  );

  // ── Main quiz view ────────────────────────────────────────────────────────

  const scoreColor = (s) => s >= 70 ? "#10b981" : s >= 40 ? "#f59e0b" : "#ef4444";
  const overallPct = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Quiz</h1>
          <p>{answered} of {total} answered · score {stats?.overallScore ?? 0}%</p>
        </div>
        <div className="topbar-right">
          <button className="qz-ghost-btn" onClick={() => router.push("/page/dashboard/flashcard")}>🃏 Flashcards</button>
          <button className="qz-ghost-btn" onClick={handleReset}>↺ Reset</button>
        </div>
      </div>

      <div className="page qz-page">

        {/* ── Master progress bar ── */}
        <div className="qz-master-progress">
          <div className="qz-mp-header">
            <span className="qz-mp-title">Overall Progress</span>
            <span className="qz-mp-pct">{overallPct}%</span>
          </div>
          <div className="qz-mp-track">
            <div className="qz-mp-fill" style={{ width: `${overallPct}%` }}>
              {overallPct > 5 && <div className="qz-mp-glow" />}
            </div>
          </div>
          <div className="qz-section-pills">
            {SECTIONS.map((s) => {
              const done = s.id === "mcq" ? mcqDone  : s.id === "tf" ? tfDone  : saDone;
              const tot  = s.id === "mcq" ? mcqTotal : s.id === "tf" ? tfTotal : saTotal;
              const pct  = tot === 0 ? 0 : Math.round((done / tot) * 100);
              return (
                <div
                  key={s.id}
                  className={`qz-pill ${activeTab === s.id ? "qz-pill--active" : ""}`}
                  style={{ "--sc": s.color, "--sbg": s.bg }}
                  onClick={() => setActiveTab(s.id)}
                >
                  <span className="qz-pill-icon">{s.icon}</span>
                  <span className="qz-pill-label">{s.label}</span>
                  <div className="qz-pill-track">
                    <div className="qz-pill-fill" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                  <span className="qz-pill-count">{done}/{tot}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Score strip ── */}
        {answered > 0 && (
          <div className="qz-score-strip">
            {[
              { label: "MCQ Accuracy", color: "#a78bfa", val: mcqDone === 0 ? "—" : `${Math.round(Object.values(progress.mcq).filter(v=>v.correct).length / mcqDone * 100)}%` },
              { label: "T/F Accuracy", color: "#38bdf8", val: tfDone  === 0 ? "—" : `${Math.round(Object.values(progress.tf).filter(v=>v.correct).length  / tfDone  * 100)}%` },
              { label: "Avg SA Score", color: "#fb923c", val: saDone  === 0 ? "—" : `${Math.round(Object.values(progress.sa).reduce((a,v)=>a+(v.score||0),0) / saDone)}%`       },
              { label: "Overall",      color: scoreColor(stats?.overallScore ?? 0), val: `${stats?.overallScore ?? 0}%` },
            ].map((s) => (
              <div key={s.label} className="qz-score-chip">
                <span className="qz-score-val" style={{ color: s.color }}>{s.val}</span>
                <span className="qz-score-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab content ── */}
        <div className="qz-tab-content" ref={sectionRef}>

          {/* MCQ */}
          {activeTab === "mcq" && (
            <div className="qz-section">
              <div className="qz-section-head">
                <div className="qz-section-icon" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>📝</div>
                <div>
                  <h2 className="qz-section-title">Multiple Choice</h2>
                  <p className="qz-section-sub">Select the best answer for each question</p>
                </div>
              </div>
              <div className="qz-questions">
                {quiz.mcq?.map((q, qi) => {
                  const ans    = progress.mcq[q.id];
                  const locked = !!ans;
                  return (
                    <div key={q.id} className={`qz-question-card ${animate === q.id ? "qz-question-card--pop" : ""}`}>
                      <div className="qz-q-header">
                        <span className="qz-q-num">Q{qi + 1}</span>
                        {locked && (
                          <span className={`qz-result-badge ${ans.correct ? "qz-result-badge--correct" : "qz-result-badge--wrong"}`}>
                            {ans.correct ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                        )}
                      </div>
                      <p className="qz-q-text">{q.question}</p>
                      <div className="qz-options">
                        {q.options?.map((opt, oi) => {
                          const letter     = opt.charAt(0);
                          const isSelected = ans?.selected?.charAt(0) === letter;
                          const isCorrect  = letter === q.correct;
                          let state = "";
                          if (locked) state = isCorrect ? "correct" : isSelected ? "wrong" : "dim";
                          return (
                            <button
                              key={oi}
                              className={`qz-option qz-option--${state || "idle"}`}
                              onClick={() => handleMCQ(q, opt)}
                              disabled={locked}
                            >
                              <span className="qz-option-letter">{letter}</span>
                              <span className="qz-option-text">{opt.slice(3)}</span>
                              {locked && isCorrect            && <span className="qz-option-tick">✓</span>}
                              {locked && isSelected && !isCorrect && <span className="qz-option-tick">✗</span>}
                            </button>
                          );
                        })}
                      </div>
                      {locked && q.explanation && (
                        <div className="qz-explanation"><span className="qz-exp-icon">💡</span>{q.explanation}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* True / False */}
          {activeTab === "tf" && (
            <div className="qz-section">
              <div className="qz-section-head">
                <div className="qz-section-icon" style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>✓✗</div>
                <div>
                  <h2 className="qz-section-title">True / False</h2>
                  <p className="qz-section-sub">Is each statement true or false?</p>
                </div>
              </div>
              <div className="qz-questions qz-questions--tf">
                {quiz.trueFalse?.map((q, qi) => {
                  const ans    = progress.tf[q.id];
                  const locked = ans !== undefined;
                  return (
                    <div key={q.id} className={`qz-question-card qz-question-card--tf ${animate === q.id ? "qz-question-card--pop" : ""}`}>
                      <div className="qz-q-header">
                        <span className="qz-q-num">{qi + 1}</span>
                        {locked && (
                          <span className={`qz-result-badge ${ans.correct ? "qz-result-badge--correct" : "qz-result-badge--wrong"}`}>
                            {ans.correct ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                        )}
                      </div>
                      <p className="qz-q-text qz-q-text--statement">"{q.statement}"</p>
                      <div className="qz-tf-row">
                        {[true, false].map((val) => {
                          const label   = val ? "True" : "False";
                          const isAns   = ans?.selected === val;
                          const isRight = q.correct === val;
                          let state = "idle";
                          if (locked) state = isRight ? "correct" : isAns ? "wrong" : "dim";
                          return (
                            <button
                              key={label}
                              className={`qz-tf-btn qz-tf-btn--${state}`}
                              onClick={() => handleTF(q, val)}
                              disabled={locked}
                            >
                              <span className="qz-tf-icon">{val ? "✓" : "✗"}</span>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {locked && q.explanation && (
                        <div className="qz-explanation"><span className="qz-exp-icon">💡</span>{q.explanation}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Short Answer */}
          {activeTab === "sa" && (
            <div className="qz-section">
              <div className="qz-section-head">
                <div className="qz-section-icon" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>💬</div>
                <div>
                  <h2 className="qz-section-title">Short Answer</h2>
                  <p className="qz-section-sub">Write your answer — scored by keyword accuracy</p>
                </div>
              </div>
              <div className="qz-questions">
                {quiz.shortAnswer?.map((q, qi) => {
                  const ans      = progress.sa[q.id];
                  const locked   = !!ans;
                  const isReveal = revealed[q.id] || locked;
                  const score    = ans?.score ?? null;
                  return (
                    <div key={q.id} className={`qz-question-card ${animate === q.id ? "qz-question-card--pop" : ""}`}>
                      <div className="qz-q-header">
                        <span className="qz-q-num">Q{qi + 1}</span>
                        {locked && score !== null && (
                          <span
                            className="qz-sa-score-badge"
                            style={{ color: scoreColor(score), borderColor: `${scoreColor(score)}44`, background: `${scoreColor(score)}18` }}
                          >
                            {score}% match
                          </span>
                        )}
                      </div>
                      <p className="qz-q-text">{q.question}</p>
                      <textarea
                        className={`qz-sa-textarea ${locked ? "qz-sa-textarea--locked" : ""}`}
                        placeholder="Type your answer here…"
                        value={locked ? ans.answer : (saInputs[q.id] || "")}
                        onChange={e => {
                          if (!locked) {
                            setSaInputs(prev => ({ ...prev, [q.id]: e.target.value }));
                            // Auto-expand textarea
                            const ta = e.target;
                            ta.style.height = "auto";
                            ta.style.height = (ta.scrollHeight) + "px";
                          }
                        }}
                        disabled={locked}
                        rows={3}
                        style={{overflowY: 'hidden', minHeight: 60, maxHeight: 300}}
                      />
                      {!locked && (
                        <button
                          className="qz-sa-submit"
                          onClick={() => handleSASubmit(q)}
                          disabled={!(saInputs[q.id] || "").trim()}
                        >
                          Submit Answer →
                        </button>
                      )}
                      {isReveal && (
                        <div className="qz-sa-reveal">
                          <div className="qz-sa-reveal-label">Model Answer</div>
                          <p className="qz-sa-model-answer">{q.modelAnswer}</p>
                          {q.keyPoints?.length > 0 && (
                            <div className="qz-sa-keypoints">
                              <span className="qz-sa-kp-label">Key points:</span>
                              {q.keyPoints.map((kp, i) => {
                                const ua  = (ans?.answer || "").toLowerCase();
                                const hit = kp.toLowerCase().split(/\s+/).filter(w=>w.length>3).some(w=>ua.includes(w));
                                return (
                                  <span key={i} className={`qz-kp-chip ${hit ? "qz-kp-chip--hit" : "qz-kp-chip--miss"}`}>
                                    {hit ? "✓" : "✗"} {kp}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ── Bottom nav ── */}
        <div className="qz-bottom-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`qz-bottom-btn ${activeTab === s.id ? "qz-bottom-btn--active" : ""}`}
              style={{ "--sc": s.color }}
              onClick={() => setActiveTab(s.id)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

      </div>
    </>
  );
}