"use client";

import { useState, useEffect } from "react";
import { Upload, Layers, Target, ClipboardList, BarChart2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserStats } from "../../../hooks/useUserStats";
import { auth } from "../../../../lib/firebase";
import { loadFlashcards, loadProgress, computeStats, computeCombinedAccuracy } from "../../../../lib/flashcardStore";
import { loadQuizProgress } from "../../../../lib/quizStore";
import "./dashboard.css";

const RATING_META = [
  { id: 0, label: "Don't Know", emoji: "😶", color: "#ef4444", grad: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" },
  { id: 1, label: "A Little Bit", emoji: "🤔", color: "#f59e0b", grad: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
  { id: 2, label: "Very Well!", emoji: "🎯", color: "#10b981", grad: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
];

const MODULES = [
  { icon: Upload,        name: "Content Intake",  desc: "Upload notes, slides, or chapters to generate study material automatically.", path: "/page/dashboard/content-intake" },
  { icon: Layers,        name: "Flashcards",       desc: "Spaced repetition cards adapted to your recall performance.", path: "/page/dashboard/flashcard" },
  { icon: Target,        name: "Chat With AI",      desc: "Self-assess your mastery with intentional recall scoring.", path: "/page/dashboard/chat-ai" },
  { icon: ClipboardList, name: "Test Yourself",    desc: "Simulate exam conditions with adaptive quiz questions.", path: "/page/dashboard/quiz" },
  { icon: BarChart2,     name: "Study Tracker",    desc: "Track sessions, recall trends, and readiness at a glance.", path: "/page/dashboard/progress-flashcard" },
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [cardStats, setCardStats] = useState(null);
  const stats = useUserStats();
  const router = useRouter();

  // Setup user listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Load flashcard stats
  useEffect(() => {
    const stored = loadFlashcards();
    const progress = loadProgress();
    const quizProgress = loadQuizProgress();
    
    if (stored?.cards?.length) {
      const computed = computeStats(stored.cards, progress);
      const combinedAccuracy = computeCombinedAccuracy(computed, quizProgress);
      setCardStats({ ...computed, combinedAccuracy });
    }
  }, []);

  // Get user's first name from email or display name
  const getUserName = () => {
    if (!user) return "there";
    if (user.displayName) return user.displayName.split(" ")[0];
    if (user.email) return user.email.split("@")[0];
    return "there";
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };

  return (
    <>
      <div className="page">
        {/* HERO */}
        <div className="hero">
          <div>
            <p className="hero-greeting">
              Good {getTimeOfDay()} {user ? `${getUserName()}` : ""} — let's study smarter
            </p>
            <h2 className="hero-title">Welcome to<br />EasyRecall</h2>
            <p className="hero-sub">
              Input once → recall repeatedly → remember efficiently.<br />
              Your AI-driven study companion that builds real memory.
            </p>
            <button className="hero-btn">Get Started →</button>
          </div>
          <div className="hero-emoji">🧠</div>
        </div>

        {/* STATS - NOW REAL-TIME WITH DETAILED INFO */}
        <div className="stats-section">
          <div className="stats-header">
            <h3>Your Progress</h3>
            <p>Cards reviewed & mastery breakdown</p>
          </div>

          {cardStats ? (
            <>
              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{cardStats.total}</div>
                  <div className="stat-name">Total Cards</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value" style={{ color: "#f59e0b" }}>
                    {stats.loading ? "—" : stats.dayStreak}
                  </div>
                  <div className="stat-name">Day Streak</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value" style={{ color: "#10b981" }}>{cardStats.mastered}</div>
                  <div className="stat-name">Mastered</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value" style={{ color: "#6366f1" }}>
                    {cardStats.combinedAccuracy}%
                  </div>
                  <div className="stat-name">Overall Accuracy</div>
                </div>
              </div>

              {/* Mastery Bar */}
              {/* <div className="mastery-section">
                <div className="mastery-header">
                  <span className="mastery-title">Mastery Breakdown</span>
                  <span className="mastery-pct">{cardStats.masteryPct}% mastered</span>
                </div>
                <div className="mastery-bar">
                  {RATING_META.map((r) => {
                    const count = cardStats.counts[r.id] || 0;
                    const pct = cardStats.total === 0 ? 0 : (count / cardStats.total) * 100;
                    return (
                      <div
                        key={r.id}
                        className="mastery-segment"
                        style={{ width: `${pct}%`, background: r.grad }}
                        title={`${r.label}: ${count}`}
                      />
                    );
                  })}
                  {cardStats.unseen > 0 && (
                    <div
                      className="mastery-segment mastery-unseen"
                      style={{ width: `${(cardStats.unseen / cardStats.total) * 100}%` }}
                      title={`Unseen: ${cardStats.unseen}`}
                    />
                  )}
                </div>
                <div className="mastery-legend">
                  {RATING_META.map((r) => (
                    <div key={r.id} className="legend-item">
                      <div className="legend-dot" style={{ background: r.color }} />
                      <span>{r.label}: <strong>{cardStats.counts[r.id] || 0}</strong></span>
                    </div>
                  ))}
                  {cardStats.unseen > 0 && (
                    <div className="legend-item">
                      <div className="legend-dot legend-unseen" />
                      <span>Unseen: <strong>{cardStats.unseen}</strong></span>
                    </div>
                  )}
                </div>
              </div> */}
            </>
          ) : (
            <div className="empty-stats">
              <p>No flashcards yet. Upload content to get started! 🚀</p>
            </div>
          )}
        </div>

        {/* MODULES */}
        <div className="modules-header">
          <div className="modules-label">Modules</div>
          <div className="modules-title">Everything you need</div>
        </div>

        <div className="modules-grid">
          {MODULES.map(({ icon: Icon, name, desc, path }) => (
            <button key={name} type="button" className="module-card" onClick={() => router.push(path)}>
              <div className="module-icon"><Icon size={20} /></div>
              <div>
                <div className="module-name">{name}</div>
                <div className="module-desc">{desc}</div>
              </div>
              <ArrowRight size={18} className="module-arrow" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}