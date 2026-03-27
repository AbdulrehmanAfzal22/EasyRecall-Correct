"use client";
import { useState, useEffect, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import "./navbar.css";
import Image from "next/image";
import logo from "../../../public/assets/logo.png";

export default function Navbar() {
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Read theme from HTML class (set by root layout script)
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = useCallback(() => {
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
  }, [isDark]);

  const handleMobileLinkClick = () => setMenuOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-inner">

            {/* ── LEFT: Logo ────────────────────────── */}
            <div className="logo-wrapper">
              <a href="/" className="logo-link" onClick={handleMobileLinkClick}>
                <Image
                  src={logo}
                  alt="EasyRecall"
                  className="logo-image"
                  priority
                />
              </a>
              <span className="domain">EasyRecall</span>
            </div>

            {/* ── CENTER: Desktop nav ───────────────── */}
            <div className="nav-links-desktop">
              <a href="#features"     className="nav-link">Features</a>
              <a href="#how-it-works" className="nav-link">How it Works</a>
              <a href="#pricing"      className="nav-link">Pricing</a>
              <a href="#faq"          className="nav-link">FAQ</a>
            </div>

            {/* ── RIGHT: Actions ────────────────────── */}
            <div className="right-section">
              <button
                onClick={toggleTheme}
                className="theme-btn"
                aria-label="Toggle theme"
                title="Toggle dark/light mode"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Sign in → opens Sign Up tab (default) */}
              <a href="/page/signup" className="signin-link">Sign in</a>

              {/* Get Started → opens Log In tab */}
              <a href="/page/signup?tab=login" className="cta-button">Get Started</a>

              <button
                className={`hamburger-btn${menuOpen ? " open" : ""}`}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
              >
                <span className="hamburger-line" />
                <span className="hamburger-line" />
                <span className="hamburger-line" />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ────────────────────────── */}
      <div
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? " open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <nav className="mobile-nav-links" aria-label="Mobile navigation">
          <a href="#features"     className="mobile-nav-link" onClick={handleMobileLinkClick}>Features</a>
          <a href="#how-it-works" className="mobile-nav-link" onClick={handleMobileLinkClick}>How it Works</a>
          <a href="#pricing"      className="mobile-nav-link" onClick={handleMobileLinkClick}>Pricing</a>
          <a href="#faq"          className="mobile-nav-link" onClick={handleMobileLinkClick}>FAQ</a>
        </nav>

        <div className="mobile-divider" />

        <div className="mobile-actions">
          <a href="/page/signup"            className="mobile-signin-link"  onClick={handleMobileLinkClick}>Sign in</a>
          <a href="/page/signup?tab=login"  className="mobile-cta-button"   onClick={handleMobileLinkClick}>Get Started</a>
        </div>
      </div>
    </>
  );
}