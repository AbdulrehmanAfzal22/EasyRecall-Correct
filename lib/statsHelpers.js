// lib/statsHelpers.js
import { doc, setDoc, updateDoc, getDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "./firebase";


/**
 * Initialize user stats document when user first signs up
 */
export async function initializeUserStats(userId) {
  const userStatsRef = doc(db, "users", userId, "stats", "main");
  try {
    const docSnap = await getDoc(userStatsRef);
    if (!docSnap.exists()) {
      await setDoc(userStatsRef, {
        userId: userId,
        totalCards: 0,
        masteredCards: 0,
        cardsReviewedToday: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log("User stats initialized");
    }
  } catch (error) {
    console.error("Error initializing user stats:", error);
  }
}


/**
 * Record a card review
 * Call this whenever user reviews a flashcard
 */
export async function recordCardReview(userId, wasMastered = false) {
  const userStatsRef = doc(db, "users", userId, "stats", "main");
  try {
    const docSnap = await getDoc(userStatsRef);
    if (!docSnap.exists()) {
      await initializeUserStats(userId);
    }
    const now = new Date();
    const data = docSnap.data() || {};
    const lastStudyDate = data.lastStudyDate?.toDate();
    // Check if it's a new day
    const isNewDay = !lastStudyDate || lastStudyDate.toDateString() !== now.toDateString();
    let updates = {
      cardsReviewedToday: isNewDay ? 1 : increment(1),
      updatedAt: serverTimestamp()
    };
    // Update streak if new day
    if (isNewDay) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const studiedYesterday = lastStudyDate && lastStudyDate.toDateString() === yesterday.toDateString();
      if (studiedYesterday) {
        // Continue streak
        updates.currentStreak = increment(1);
        updates.longestStreak = Math.max(
          data.longestStreak || 0,
          (data.currentStreak || 0) + 1
        );
      } else if (!lastStudyDate) {
        // First day
        updates.currentStreak = 1;
        updates.longestStreak = 1;
      } else {
        // Streak broken
        updates.currentStreak = 1;
      }
      updates.lastStudyDate = serverTimestamp();
    }
    // Update mastered count if applicable
    if (wasMastered) {
      updates.masteredCards = increment(1);
    }
    await updateDoc(userStatsRef, updates);
  } catch (error) {
    console.error("Error recording card review:", error);
  }
}

/**
 * Add new cards to total count
 * Call this when user creates new flashcards
 */
export async function addCards(userId, count = 1) {
  const userStatsRef = doc(db, "users", userId, "stats", "main");
  
  try {
    const docSnap = await getDoc(userStatsRef);
    
    if (!docSnap.exists()) {
      await initializeUserStats(userId);
    }

    await updateDoc(userStatsRef, {
      totalCards: increment(count),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding cards:", error);
  }
}

/**
 * Mark a card as mastered
 * Call this when user masters a flashcard (e.g., gets it right 5 times in a row)
 */
export async function markCardAsMastered(userId) {
  const userStatsRef = doc(db, "users", userId, "stats", "main");
  
  try {
    await updateDoc(userStatsRef, {
      masteredCards: increment(1),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error marking card as mastered:", error);
  }
}

/**
 * Get current user stats
 * Use this for one-time reads (not real-time)
 */
export async function getUserStats(userId) {
  const userStatsRef = doc(db, "users", userId, "stats", "main");
  
  try {
    const docSnap = await getDoc(userStatsRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return {
        totalCards: 0,
        masteredCards: 0,
        cardsReviewedToday: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }
  } catch (error) {
    console.error("Error getting user stats:", error);
    return null;
  }
}

/**
 * Reset daily stats (call this in a scheduled function at midnight)
 */
export async function resetDailyStats(userId) {
  const userStatsRef = doc(db, "users", userId, "stats", "main");
  
  try {
    await updateDoc(userStatsRef, {
      cardsReviewedToday: 0,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error resetting daily stats:", error);
  }
}