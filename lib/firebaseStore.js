// lib/firebaseStore.js
// Firestore-based store for real-time sync across devices

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { serverTimestamp } from "firebase/firestore";

/**
 * FLASHCARDS - Real-time sync across devices
 */

export async function saveFlashcardsToFirestore(userId, cardData, meta = {}) {
  try {
    const cardRef = doc(db, "users", userId, "flashcards", "data");
    await setDoc(
      cardRef,
      {
        cards: cardData,
        meta: { ...meta, updatedAt: serverTimestamp() },
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error saving flashcards to Firestore:", error);
    throw error;
  }
}

export function subscribeToFlashcards(userId, callback) {
  try {
    const cardRef = doc(db, "users", userId, "flashcards", "data");
    const unsubscribe = onSnapshot(
      cardRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ success: true, data: docSnap.data() });
        } else {
          callback({ success: true, data: null });
        }
      },
      (error) => {
        console.error("Error subscribing to flashcards:", error);
        callback({ success: false, error });
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up flashcard subscription:", error);
  }
}

export async function getFlashcardsFromFirestore(userId) {
    if (!userId) throw new Error("User not authenticated");
  try {
    const cardRef = doc(db, "users", userId, "flashcards", "data");
    const docSnap = await getDoc(cardRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    return null;
  }
}

/**
 * FLASHCARD PROGRESS - Real-time sync
 */

export async function saveFlashcardProgress(userId, progress) {
  try {
    const progressRef = doc(db, "users", userId, "flashcards", "progress");
    await setDoc(progressRef, { progress, updatedAt: new Date() }, { merge: true });
  } catch (error) {
    console.error("Error saving flashcard progress:", error);
    throw error;
  }
}

export function subscribeToFlashcardProgress(userId, callback) {
  try {
    const progressRef = doc(db, "users", userId, "flashcards", "progress");
    const unsubscribe = onSnapshot(
      progressRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ success: true, data: docSnap.data().progress || {} });
        } else {
          callback({ success: true, data: {} });
        }
      },
      (error) => {
        console.error("Error subscribing to progress:", error);
        callback({ success: false, error });
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up progress subscription:", error);
  }
}

/**
 * QUIZ DATA - Real-time sync across devices
 */

export async function saveQuizToFirestore(userId, quizData, meta = {}) {
  try {
    const quizRef = doc(db, "users", userId, "quizzes", "data");
    await setDoc(
      quizRef,
      {
        quiz: quizData,
        meta: { ...meta, updatedAt: serverTimestamp() },
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error saving quiz to Firestore:", error);
    throw error;
  }
}

export function subscribeToQuiz(userId, callback) {
  try {
    const quizRef = doc(db, "users", userId, "quizzes", "data");
    const unsubscribe = onSnapshot(
      quizRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ success: true, data: docSnap.data() });
        } else {
          callback({ success: true, data: null });
        }
      },
      (error) => {
        console.error("Error subscribing to quiz:", error);
        callback({ success: false, error });
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up quiz subscription:", error);
  }
}

export async function getQuizFromFirestore(userId) {
    if (!userId) throw new Error("User not authenticated");
  try {
    const quizRef = doc(db, "users", userId, "quizzes", "data");
    const docSnap = await getDoc(quizRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return null;
  }
}

/**
 * QUIZ PROGRESS - Real-time sync
 */

export async function saveQuizProgress(userId, progress) {
  try {
    const progressRef = doc(db, "users", userId, "quizzes", "progress");
    await setDoc(progressRef, { progress, updatedAt: new Date() }, { merge: true });
  } catch (error) {
    console.error("Error saving quiz progress:", error);
    throw error;
  }
}

export function subscribeToQuizProgress(userId, callback) {
  try {
    const progressRef = doc(db, "users", userId, "quizzes", "progress");
    const unsubscribe = onSnapshot(
      progressRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          callback({ success: true, data: data.progress || {} });
        } else {
          callback({ success: true, data: {} });
        }
      },
      (error) => {
        console.error("Error subscribing to quiz progress:", error);
        callback({ success: false, error });
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up quiz progress subscription:", error);
  }
}

/**
 * SEGMENTS - Real-time sync across devices
 */

export async function saveSegmentsToFirestore(userId, segmentData, meta = {}) {
  try {
    const segmentRef = doc(db, "users", userId, "segments", "data");
    await setDoc(
      segmentRef,
      {
        groups: segmentData.groups || [],
        stats: segmentData.stats || {},
        fileNames: meta.fileNames || "",
        topic: meta.topic || "",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error saving segments to Firestore:", error);
    throw error;
  }
}

export function subscribeToSegments(userId, callback) {
  try {
    const segmentRef = doc(db, "users", userId, "segments", "data");
    const unsubscribe = onSnapshot(
      segmentRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ success: true, data: docSnap.data() });
        } else {
          callback({ success: true, data: null });
        }
      },
      (error) => {
        console.error("Error subscribing to segments:", error);
        callback({ success: false, error });
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up segment subscription:", error);
  }
}

export async function getSegmentsFromFirestore(userId) {
    if (!userId) throw new Error("User not authenticated");
  try {
    const segmentRef = doc(db, "users", userId, "segments", "data");
    const docSnap = await getDoc(segmentRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error fetching segments:", error);
    return null;
  }
}

/**
 * FALLBACK - Local storage functions for offline support
 */

const STORAGE_PREFIX = "easyrecall_";

export function syncToLocalStorage(key, data) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error syncing to localStorage:", error);
  }
}

export function getFromLocalStorage(key) {
  try {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(STORAGE_PREFIX + key);
      return data ? JSON.parse(data) : null;
    }
  } catch (error) {
    console.error("Error reading from localStorage:", error);
  }
  return null;
}

export function clearLocalStorage(key) {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_PREFIX + key);
    }
  } catch (error) {
    console.error("Error clearing localStorage:", error);
  }
}

/**
 * CHAT HISTORY - Store and retrieve chat conversations
 */

export async function saveChatToFirestore(userId, chatId, messages, title = null) {
  try {
    const chatRef = doc(db, "users", userId, "chats", chatId);
    const chatData = {
      id: chatId,
      messages: messages,
      title: title || generateChatTitle(messages),
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    await setDoc(chatRef, chatData, { merge: true });
    return chatData;
  } catch (error) {
    console.error("Error saving chat to Firestore:", error);
    throw error;
  }
}

export async function getUserChats(userId) {
  try {
    const chatsRef = collection(db, "users", userId, "chats");
    const q = query(chatsRef, where("createdAt", "!=", null));
    const querySnapshot = await getDocs(q);

    const chats = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() });
    });

    // Sort by updatedAt descending
    return chats.sort((a, b) => new Date(b.updatedAt?.toDate?.() || b.updatedAt) - new Date(a.updatedAt?.toDate?.() || a.updatedAt));
  } catch (error) {
    console.error("Error getting user chats:", error);
    throw error;
  }
}

export async function getChatById(userId, chatId) {
  try {
    const chatRef = doc(db, "users", userId, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
      return { id: chatSnap.id, ...chatSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting chat by ID:", error);
    throw error;
  }
}

export async function deleteChatFromFirestore(userId, chatId) {
  try {
    const chatRef = doc(db, "users", userId, "chats", chatId);
    await deleteDoc(chatRef);
  } catch (error) {
    console.error("Error deleting chat from Firestore:", error);
    throw error;
  }
}

export function subscribeToUserChats(userId, callback) {
  try {
    const chatsRef = collection(db, "users", userId, "chats");
    const unsubscribe = onSnapshot(
      chatsRef,
      (querySnapshot) => {
        const chats = [];
        querySnapshot.forEach((doc) => {
          chats.push({ id: doc.id, ...doc.data() });
        });
        // Sort by updatedAt descending
        chats.sort((a, b) => new Date(b.updatedAt?.toDate?.() || b.updatedAt) - new Date(a.updatedAt?.toDate?.() || a.updatedAt));
        callback({ success: true, data: chats });
      },
      (error) => {
        console.error("Error subscribing to chats:", error);
        callback({ success: false, error });
      }
    );
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up chat subscription:", error);
    throw error;
  }
}

function generateChatTitle(messages) {
  // Generate a title from the first user message
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content || '';
    // Take first 50 characters and clean it up
    const title = content.substring(0, 50).replace(/\n/g, ' ').trim();
    return title || 'New Chat';
  }
  return 'New Chat';
}
