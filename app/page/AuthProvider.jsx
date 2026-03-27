// components/AuthProvider.jsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { initializeUserStats } from "../../lib/statsHelpers";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Initialize user stats for new users
      if (user) {
        // Clear any in-memory study state so the user starts
        // from their library/content instead of stale local data.
        try {
          localStorage.removeItem("mem_fc_cards");
          localStorage.removeItem("mem_fc_progress");
          localStorage.removeItem("mem_fc_session");
          localStorage.removeItem("mem_quiz_data");
          localStorage.removeItem("mem_quiz_progress");
          localStorage.removeItem("segmentData");
        } catch {
          // ignore localStorage errors
        }

        await initializeUserStats(user.uid);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}