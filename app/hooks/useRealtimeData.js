// app/hooks/useRealtimeData.js
"use client";

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import {
  subscribeToFlashcards,
  subscribeToFlashcardProgress,
  subscribeToQuiz,
  subscribeToQuizProgress,
  subscribeToSegments,
  getFromLocalStorage,
  syncToLocalStorage,
} from "../../lib/firebaseStore";

/**
 */
export function useRealtimeFlashcards() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({
    cards: [],
    meta: {},
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setData({ cards: [], meta: {}, loading: false });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToFlashcards(user.uid, (result) => {
      if (result.success && result.data) {
        setData({
          cards: result.data.cards || [],
          meta: result.data.meta || {},
          loading: false,
        });
        // Keep localStorage in sync for offline support
        syncToLocalStorage("flashcards", result.data);
      } else if (result.success && !result.data) {
        // Try fallback to localStorage
        const cached = getFromLocalStorage("flashcards");
        setData({
          cards: cached?.cards || [],
          meta: cached?.meta || {},
          loading: false,
        });
      } else {
        setData((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribe?.();
  }, [user?.uid]);

  return data;
}

/**
 * Hook for real-time flashcard progress sync
 */
export function useRealtimeFlashcardProgress() {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState({
    data: {},
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProgress({ data: {}, loading: false });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToFlashcardProgress(user.uid, (result) => {
      if (result.success) {
        setProgress({
          data: result.data || {},
          loading: false,
        });
        syncToLocalStorage("flashcard_progress", result.data || {});
      } else {
        setProgress((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribe?.();
  }, [user?.uid]);

  return progress;
}

/**
 * Hook for real-time quiz sync across devices
 */
export function useRealtimeQuiz() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({
    quiz: null,
    meta: {},
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setData({ quiz: null, meta: {}, loading: false });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToQuiz(user.uid, (result) => {
      if (result.success && result.data) {
        setData({
          quiz: result.data.quiz || null,
          meta: result.data.meta || {},
          loading: false,
        });
        syncToLocalStorage("quiz", result.data);
      } else if (result.success && !result.data) {
        const cached = getFromLocalStorage("quiz");
        setData({
          quiz: cached?.quiz || null,
          meta: cached?.meta || {},
          loading: false,
        });
      } else {
        setData((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribe?.();
  }, [user?.uid]);

  return data;
}

/**
 * Hook for real-time quiz progress sync
 */
export function useRealtimeQuizProgress() {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState({
    data: { mcq: {}, tf: {}, sa: {} },
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProgress({
          data: { mcq: {}, tf: {}, sa: {} },
          loading: false,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToQuizProgress(user.uid, (result) => {
      if (result.success) {
        const progressData = result.data || { mcq: {}, tf: {}, sa: {} };
        setProgress({
          data: progressData,
          loading: false,
        });
        syncToLocalStorage("quiz_progress", progressData);
      } else {
        setProgress((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribe?.();
  }, [user?.uid]);

  return progress;
}

/**
 * Hook for real-time segments sync
 */
export function useRealtimeSegments() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({
    groups: [],
    stats: {},
    fileNames: "",
    topic: "",
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setData({
          groups: [],
          stats: {},
          fileNames: "",
          topic: "",
          loading: false,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToSegments(user.uid, (result) => {
      if (result.success && result.data) {
        const segmentData = result.data;
        setData({
          groups: segmentData.groups || [],
          stats: segmentData.stats || {},
          fileNames: segmentData.fileNames || "",
          topic: segmentData.topic || "",
          loading: false,
        });
        syncToLocalStorage("segments", segmentData);
      } else if (result.success && !result.data) {
        const cached = getFromLocalStorage("segments");
        setData({
          groups: cached?.groups || [],
          stats: cached?.stats || {},
          fileNames: cached?.fileNames || "",
          topic: cached?.topic || "",
          loading: false,
        });
      } else {
        setData((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribe?.();
  }, [user?.uid]);

  return data;
}
