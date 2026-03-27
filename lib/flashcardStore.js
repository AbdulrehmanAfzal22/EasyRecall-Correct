// lib/flashcardStore.js
// Central store for flashcard data management with Firestore sync

import { auth } from "./firebase";
import { saveFlashcardsToFirestore, saveFlashcardProgress } from "./firebaseStore";

const KEYS = {
  CARDS: "mem_fc_cards",
  PROGRESS: "mem_fc_progress",
  SESSION: "mem_fc_session",
};

// ─── Cards ──────────────────────────────────────────────────────────────────

export function saveFlashcards(cards, meta = {}) {
  if (typeof window === "undefined") return;
  
  const payload = { cards, meta: { ...meta, savedAt: Date.now() } };
  
  // Save to localStorage for offline support
  localStorage.setItem(KEYS.CARDS, JSON.stringify(payload));
  localStorage.removeItem(KEYS.SESSION); // reset cursor
  
  // Sync to Firestore if user is logged in
  if (auth.currentUser?.uid) {
    saveFlashcardsToFirestore(auth.currentUser.uid, cards, meta).catch((error) => {
      console.warn("Could not sync flashcards to Firestore:", error);
    });
  }
}

export function loadFlashcards() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(KEYS.CARDS)); } catch { return null; }
}

// ─── Progress ────────────────────────────────────────────────────────────────
// rating: 0 = don't know | 1 = a little bit | 2 = very well

export function loadProgress() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEYS.PROGRESS)) || {}; } catch { return {}; }
}

export function saveRating(cardIndex, rating) {
  const p = loadProgress();
  p[cardIndex] = { rating, seenCount: (p[cardIndex]?.seenCount || 0) + 1, lastSeen: Date.now() };
  
  // Save to localStorage
  localStorage.setItem(KEYS.PROGRESS, JSON.stringify(p));
  
  // Sync to Firestore
  if (auth.currentUser?.uid) {
    saveFlashcardProgress(auth.currentUser.uid, p).catch((error) => {
      console.warn("Could not sync progress to Firestore:", error);
    });
  }
  
  return p;
}

export function clearProgress() {
  localStorage.removeItem(KEYS.PROGRESS);
}

// ─── Session (current card index) ────────────────────────────────────────────

export function saveSession(i) { localStorage.setItem(KEYS.SESSION, String(i)); }
export function loadSession()  { const v = localStorage.getItem(KEYS.SESSION); return v !== null ? parseInt(v, 10) : 0; }

// ─── Stats ────────────────────────────────────────────────────────────────────

export function computeStats(cards, progress) {
  const total   = cards.length;
  const counts  = { 0: 0, 1: 0, 2: 0 };
  Object.values(progress).forEach(({ rating }) => { counts[rating] = (counts[rating] || 0) + 1; });
  const seen    = Object.keys(progress).length;
  const unseen  = total - seen;
  const accuracy   = seen === 0 ? 0 : Math.round(((counts[1] + counts[2]) / seen) * 100);
  const masteryPct = total === 0 ? 0 : Math.round((counts[2] / total) * 100);
  return { total, seen, unseen, counts, accuracy, mastered: counts[2], masteryPct };
}

// ── Combined Accuracy from ALL content (flashcards + quiz + segments) ──────

export function computeCombinedAccuracy(flashcardStats, quizStats) {
  let totalAttempts = 0;
  let totalCorrect = 0;

  // Flashcard accuracy (rating 1 & 2 are considered correct)
  if (flashcardStats && flashcardStats.seen > 0) {
    totalAttempts += flashcardStats.seen;
    totalCorrect += (flashcardStats.counts[1] || 0) + (flashcardStats.counts[2] || 0);
  }

  // Quiz accuracy
  if (quizStats) {
    // MCQ correct answers
    const mcqCorrect = Object.values(quizStats.mcq || {}).filter((v) => v.correct).length;
    const mcqTotal = Object.keys(quizStats.mcq || {}).length;

    // True/False correct answers
    const tfCorrect = Object.values(quizStats.tf || {}).filter((v) => v.correct).length;
    const tfTotal = Object.keys(quizStats.tf || {}).length;

    // Short Answer - count answers with score >= 50 as correct
    const saCorrect = Object.values(quizStats.sa || {}).filter((v) => v.score >= 50).length;
    const saTotal = Object.keys(quizStats.sa || {}).length;

    totalAttempts += mcqTotal + tfTotal + saTotal;
    totalCorrect += mcqCorrect + tfCorrect + saCorrect;
  }

  return totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);
}
