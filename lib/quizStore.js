// quizStore.js — put in lib/ next to flashcardStore.js

import { auth } from "./firebase";
import { saveQuizToFirestore, saveQuizProgress, getQuizFromFirestore } from "./firebaseStore";

const KEYS = {
  QUIZ:     "mem_quiz_data",
  PROGRESS: "mem_quiz_progress",
};

// ── Save / Load quiz ──────────────────────────────────────────────────────

export function saveQuiz(quiz, meta = {}) {
  if (typeof window === "undefined") return;
  
  const payload = { quiz, meta: { ...meta, savedAt: Date.now() } };
  
  // Save to localStorage
  localStorage.setItem(KEYS.QUIZ, JSON.stringify(payload));
  localStorage.removeItem(KEYS.PROGRESS); // reset on new quiz
  
  // Sync to Firestore
  if (auth.currentUser?.uid) {
    saveQuizToFirestore(auth.currentUser.uid, quiz, meta).catch((error) => {
      console.warn("Could not sync quiz to Firestore:", error);
    });
  }
}

export async function loadQuiz() {
  if (typeof window === "undefined") return null;
  try {
    const local = JSON.parse(localStorage.getItem(KEYS.QUIZ));
    if (local && local.quiz) return local;
    if (auth.currentUser?.uid) {
      const remote = await getQuizFromFirestore(auth.currentUser.uid);
      if (remote && remote.quiz) {
        localStorage.setItem(KEYS.QUIZ, JSON.stringify(remote));
        return remote;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Progress ──────────────────────────────────────────────────────────────
// Shape: { mcq: { [id]: { selected, correct } }, tf: { [id]: { selected, correct } }, sa: { [id]: { answer, score } } }

export function loadQuizProgress() {
  if (typeof window === "undefined") return emptyProgress();
  try { return JSON.parse(localStorage.getItem(KEYS.PROGRESS)) || emptyProgress(); }
  catch { return emptyProgress(); }
}

function emptyProgress() {
  return { mcq: {}, tf: {}, sa: {} };
}

export function saveMCQAnswer(id, selected, correct) {
  const p = loadQuizProgress();
  p.mcq[id] = { selected, correct, answeredAt: Date.now() };
  
  localStorage.setItem(KEYS.PROGRESS, JSON.stringify(p));
  
  if (auth.currentUser?.uid) {
    saveQuizProgress(auth.currentUser.uid, p).catch((error) => {
      console.warn("Could not sync quiz progress to Firestore:", error);
    });
  }
  
  return p;
}

export function saveTFAnswer(id, selected, correct) {
  const p = loadQuizProgress();
  p.tf[id] = { selected, correct, answeredAt: Date.now() };
  
  localStorage.setItem(KEYS.PROGRESS, JSON.stringify(p));
  
  if (auth.currentUser?.uid) {
    saveQuizProgress(auth.currentUser.uid, p).catch((error) => {
      console.warn("Could not sync quiz progress to Firestore:", error);
    });
  }
  
  return p;
}

export function saveSAAnswer(id, answer, score) {
  // score: 0–100
  const p = loadQuizProgress();
  p.sa[id] = { answer, score, answeredAt: Date.now() };
  
  localStorage.setItem(KEYS.PROGRESS, JSON.stringify(p));
  
  if (auth.currentUser?.uid) {
    saveQuizProgress(auth.currentUser.uid, p).catch((error) => {
      console.warn("Could not sync quiz progress to Firestore:", error);
    });
  }
  
  return p;
}

export function clearQuizProgress() {
  localStorage.removeItem(KEYS.PROGRESS);
}

// ── Stats ─────────────────────────────────────────────────────────────────

export function computeQuizStats(quiz, progress) {
  const mcqTotal  = quiz.mcq?.length        || 0;
  const tfTotal   = quiz.trueFalse?.length  || 0;
  const saTotal   = quiz.shortAnswer?.length || 0;
  const total     = mcqTotal + tfTotal + saTotal;

  const mcqDone   = Object.keys(progress.mcq).length;
  const tfDone    = Object.keys(progress.tf).length;
  const saDone    = Object.keys(progress.sa).length;
  const answered  = mcqDone + tfDone + saDone;

  const mcqRight  = Object.values(progress.mcq).filter((v) => v.correct).length;
  const tfRight   = Object.values(progress.tf).filter((v) => v.correct).length;
  const saScore   = Object.values(progress.sa).reduce((acc, v) => acc + (v.score || 0), 0);
  const saAvg     = saDone === 0 ? 0 : saScore / saDone;

  const overallScore = total === 0 ? 0 : Math.round(
    ((mcqRight + tfRight + (saAvg / 100) * saDone) / total) * 100
  );

  return {
    total, answered, remaining: total - answered,
    mcq:  { total: mcqTotal,  done: mcqDone,  correct: mcqRight  },
    tf:   { total: tfTotal,   done: tfDone,   correct: tfRight   },
    sa:   { total: saTotal,   done: saDone,   avgScore: Math.round(saAvg) },
    overallScore,
  };
}