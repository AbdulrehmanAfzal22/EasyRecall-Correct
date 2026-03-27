"use client";

import { useState, useEffect } from "react";
import Sidebar from "../sidebar/page";
import "../dash-home/dashboard.css";

export default function DashboardLayout({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read theme from HTML class (set by root layout script)
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const newIsDark = !isDark;
    
    if (newIsDark) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    setIsDark(newIsDark);
  };

  return (
    <div className={`dashboard-shell ${isDark ? "dark-mode" : ""}`}>
      <Sidebar isDark={isDark} onToggleTheme={toggleTheme} />

      <main className="dashboard-main">
        {children ? (
          children
        ) : (
          <div className="dashboard-home">
            <h1>Welcome to Your Dashboard</h1>
            <p>Select a module from the sidebar to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}