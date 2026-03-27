"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { updateDailyVisit } from "../../lib/service";

export function useUserStats() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    cardsReviewed: 0,
    dayStreak: 0,
    mastered: 0,
    readiness: 0,
    loading: true
  });

  // Setup user listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      
      // Track daily visit when user logs in
      if (currentUser?.uid) {
        updateDailyVisit(currentUser.uid).catch((err) => {
          console.warn("Failed to update daily visit:", err);
        });
      }
      
      if (!currentUser) {
        setStats({
          cardsReviewed: 0,
          dayStreak: 0,
          mastered: 0,
          readiness: 0,
          loading: false
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Setup stats listener - depends on user.uid, not just user object
  useEffect(() => {
    if (!user?.uid) {
      setStats({
        cardsReviewed: 0,
        dayStreak: 0,
        mastered: 0,
        readiness: 0,
        loading: false
      });
      return;
    }

    const userStatsRef = doc(db, "userStats", user.uid);

    const unsubscribe = onSnapshot(
      userStatsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          const totalCards = data.totalCards || 0;
          const masteredCards = data.masteredCards || 0;

          const readinessPercent =
            totalCards > 0
              ? Math.round((masteredCards / totalCards) * 100)
              : 0;

          const lastVisitDate = data.lastVisitDate?.toDate();
          const dayStreak = calculateStreak(
            lastVisitDate,
            data.currentStreak || 0
          );

          setStats({
            cardsReviewed: data.cardsReviewedToday || 0,
            dayStreak,
            mastered: masteredCards,
            readiness: readinessPercent,
            loading: false
          });
        } else {
          setStats({
            cardsReviewed: 0,
            dayStreak: 0,
            mastered: 0,
            readiness: 0,
            loading: false
          });
        }
      },
      (error) => {
        console.error("Error fetching user stats:", error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return stats;
}

// Helper function
function calculateStreak(lastVisitDate, currentStreak) {
  if (!lastVisitDate || !currentStreak) return currentStreak || 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const lastVisit = new Date(
    lastVisitDate.getFullYear(),
    lastVisitDate.getMonth(),
    lastVisitDate.getDate()
  );

  const diffTime = today - lastVisit;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // If last visit was today or yesterday, return the currentStreak
  if (diffDays === 0 || diffDays === 1) {
    return currentStreak;
  }

  // If more than 1 day has passed, streak is broken
  return 0;
}