// lib/segmentStore.js
// Mirrors the pattern of flashcardStore / quizStore with Firestore sync

import { auth } from "./firebase";
import { saveSegmentsToFirestore, getSegmentsFromFirestore } from "./firebaseStore";

const STORAGE_KEY = "segmentData";

/**
 * Save extracted segments to localStorage and Firestore
 * @param {{ groups: Array, stats: Object }} data
 * @param {{ fileNames: string, topic: string }} meta
 */
export function saveSegments(data, meta = {}) {
  try {
    const payload = {
      groups:    data.groups    ?? [],
      stats:     data.stats     ?? {},
      fileNames: meta.fileNames ?? "",
      topic:     meta.topic     ?? "",
      savedAt:   Date.now(),
    };
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    
    // Sync to Firestore
    if (auth.currentUser?.uid) {
      saveSegmentsToFirestore(auth.currentUser.uid, data, meta).catch((error) => {
        console.warn("Could not sync segments to Firestore:", error);
      });
    }
  } catch (e) {
    console.error("segmentStore.save error:", e);
  }
}

/**
 * Load saved segments from localStorage
 * @returns {{ groups, stats, fileNames, topic, savedAt } | null}
 */
export async function loadSegments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    if (auth.currentUser?.uid) {
      const remote = await getSegmentsFromFirestore(auth.currentUser.uid);
      if (remote && remote.groups) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        return remote;
      }
    }
    return null;
  } catch (e) {
    console.error("segmentStore.load error:", e);
    return null;
  }
}

/** Clear saved segments */
export function clearSegments() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("segmentStore.clear error:", e);
  }
}

/** Returns true if there are saved segments */
export function hasSegments() {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}