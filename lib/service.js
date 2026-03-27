// lib/contentService.js
// All Firebase operations for user study content

import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// ── Firestore path: users/{uid}/documents ─────────────────────────────────
const userCol = (uid) => collection(db, "users", uid, "documents");

// ── Upload file to Storage + save everything to Firestore ─────────────────
export async function saveDocument(uid, {
  file,
  extractedText,
  flashcards,
  quiz,
  topic,
  segments,
  segmentStats,
}) {
  let downloadURL = "";
  let storagePath = "";

  // 1. Upload the raw file to Firebase Storage (if a real file)
  if (file) {
    storagePath = `users/${uid}/files/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file);
    downloadURL = await getDownloadURL(fileRef);
  }

  // 2. Save metadata + AI-generated content to Firestore
  const segGroups = segments || null;
  const segStats  = segmentStats || null;
  const segCount  = segStats?.totalSegments
    ?? (Array.isArray(segGroups) ? segGroups.reduce((acc, g) => acc + (g.segments?.length || 0), 0) : 0);

  const docRef = await addDoc(userCol(uid), {
    topic:          topic || file?.name || "Untitled",
    fileName:       file?.name || "Pasted text",
    fileType:       file ? file.name.split(".").pop().toLowerCase() : "txt",
    fileSize:       file?.size || 0,
    storagePath,
    downloadURL,
    extractedText:  (extractedText || "").slice(0, 12000), // Firestore 1MB doc limit
    flashcards:     flashcards || [],
    flashcardCount: (flashcards || []).length,
    quiz:           quiz || null,
    quizCount:      quiz
      ? (quiz.mcq?.length || 0) + (quiz.trueFalse?.length || 0) + (quiz.shortAnswer?.length || 0)
      : 0,
    segments:       segGroups,
    segmentCount:   segCount,
    segmentStats:   segStats,
    createdAt:      serverTimestamp(),
  });

  return docRef.id;
}

// ── Load all documents for a user (newest first) ──────────────────────────
export async function loadDocuments(uid) {
  const q    = query(userCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  }));
}

// ── Delete document from Firestore + file from Storage ────────────────────
export async function deleteDocument(uid, docId, storagePath) {
  const docRef = doc(db, "users", uid, "documents", docId);
  const userStatsRef = doc(db, "userStats", uid);

  // Read document to collect counts before deletion
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data() || {};

  const flashcardCount = data.flashcardCount || (Array.isArray(data.flashcards) ? data.flashcards.length : 0);

  // If per-document flashcard progress exists, count mastered entries
  let masteredInDoc = 0;
  if (data.flashcardProgress && typeof data.flashcardProgress === "object") {
    const progVals = Object.values(data.flashcardProgress || {});
    masteredInDoc = progVals.filter((p) => p && p.rating === 2).length;
  }

  // Use a batch to atomically update userStats and delete the document
  const batch = writeBatch(db);
  if (flashcardCount > 0) {
    batch.update(userStatsRef, { totalCards: increment(-flashcardCount), updatedAt: serverTimestamp() });
  }
  if (masteredInDoc > 0) {
    batch.update(userStatsRef, { masteredCards: increment(-masteredInDoc), updatedAt: serverTimestamp() });
  }
  batch.delete(docRef);

  await batch.commit();

  // Delete storage object (separate from Firestore batch)
  if (storagePath) {
    try {
      await deleteObject(ref(storage, storagePath));
    } catch (_) {
      // File may have already been deleted — ignore
    }
  }
}

// ── Update document (e.g. rename topic) ──────────────────────────────────
export async function updateDocument(uid, docId, updates) {
  await updateDoc(doc(db, "users", uid, "documents", docId), updates);
}

// ── Save flashcard progress back to Firestore ─────────────────────────────
export async function saveFlashcardProgress(uid, docId, progress) {
  await updateDoc(doc(db, "users", uid, "documents", docId), {
    flashcardProgress: progress,
  });
}

// ── Save quiz progress back to Firestore ──────────────────────────────────
export async function saveQuizProgress(uid, docId, progress) {
  await updateDoc(doc(db, "users", uid, "documents", docId), {
    quizProgress: progress,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function formatFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024)    return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60)   return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Track daily visits and update day streak ──────────────────────────────
export async function updateDailyVisit(uid) {
  const userStatsRef = doc(db, "userStats", uid);
  
  try {
    const statsSnap = await getDoc(userStatsRef);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 1;
    let lastVisitDate = today;
    
    if (statsSnap.exists()) {
      const data = statsSnap.data();
      const lastVisit = data.lastVisitDate?.toDate();
      
      if (lastVisit) {
        const lastVisitDay = new Date(lastVisit);
        lastVisitDay.setHours(0, 0, 0, 0);
        
        const diffTime = today - lastVisitDay;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // User visited today already, don't change streak
          return;
        } else if (diffDays === 1) {
          // User visited yesterday, increment streak
          currentStreak = (data.currentStreak || 1) + 1;
        } else {
          // User missed days, reset streak to 1
          currentStreak = 1;
        }
      }
      
      // Update existing stats
      await updateDoc(userStatsRef, {
        currentStreak,
        lastVisitDate: today,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new stats document for first visit
      await updateDoc(userStatsRef, {
        currentStreak: 1,
        lastVisitDate: today,
        totalCards: 0,
        masteredCards: 0,
        cardsReviewedToday: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(async (error) => {
        // If update fails because document doesn't exist, create it
        if (error.code === 'not-found') {
          const batch = writeBatch(db);
          batch.set(userStatsRef, {
            currentStreak: 1,
            lastVisitDate: today,
            totalCards: 0,
            masteredCards: 0,
            cardsReviewedToday: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        } else {
          throw error;
        }
      });
    }
  } catch (error) {
    console.error("Error updating daily visit:", error);
  }
}