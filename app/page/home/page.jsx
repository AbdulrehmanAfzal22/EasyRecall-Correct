// components/Hero.tsx
"use client";

import { useState, useEffect } from "react";

import "./home.css";

export default function Hero() {
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
    <section className="hero">
      <div className="hero-container">

        {/* Theme toggle – uncomment if you want it visible */}
        {/* <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle dark/light mode"
          title="Toggle theme"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button> */}

        <div className="content-grid">

          {/* ─── Left side – Text & CTAs ─── */}
          <div className="left-content">
            <div className="badges">
              <span className="badge ai">✦ AI-Powered Study Tool</span>
              <span className="badge lang">🌐 20+ Languages</span>
            </div>

            <h1 className="headline">
              Transform Your Study Materials into
              <span className="highlight"> Interactive Quizzes</span> &{" "}
              <span className="highlight">Smart Flashcards</span>
            </h1>

            <p className="subtitle">
              Upload your study materials in 20+ languages and let AI create
              personalized quizzes and flashcards. Master your subjects with
              dynamic learning tools, track your progress, and ace your exams
              with confidence.
            </p>

            <div className="trust">
              <div className="avatars">
                <div className="avatar">M</div>
                <div className="avatar">A</div>
                <div className="avatar">S</div>
              </div>
              <span>Trusted by 4,000+ students worldwide</span>
            </div>

            <div className="cta-group">
              <button
                className="btn primary"
                onClick={() => window.location.href = "/page/signup"}
              >
                Start Learning Now →
              </button>
              <button
                className="btn secondary"
                onClick={() => {
                  const faq = document.getElementById("faq-section");
                  if (faq) faq.scrollIntoView({ behavior: "smooth" });
                  else window.location.href = "/#faq-section";
                }}
              >
                See How It Works
              </button>
            </div>
          </div>

          {/* ─── Right side – Video / mockup area ─── */}
          <div className="right-content">
            <div className="mockup-container">

              {/* === Replace everything below this line with your real video === */}

              {/* Option A: Self-hosted video (recommended for best performance) */}
              {/* <video
                autoPlay
                muted
                loop
                playsInline
                className="demo-video"
                poster="/images/poster.jpg"   // optional
              >
                <source src="/videos/your-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video> */}

              {/* Option B: YouTube embed (easy & good for existing videos) */}
              {/* <div className="video-wrapper">
                <iframe
                  src="https://www.youtube.com/embed/XXXXXXXXXXX?autoplay=1&mute=1&loop=1&playlist=XXXXXXXXXXX&controls=0&modestbranding=1"
                  title="EasyRecall Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div> */}

              {/* === Placeholder (keep only if you haven't added video yet) === */}
              <div className="video-placeholder">
                <span>Video / Interactive Demo Here</span>
                <p>Paste your &lt;video&gt; or &lt;iframe&gt; code here</p>
              </div>

              {/* Optional elements from your original design */}
              {/* <div className="floating-label">
                <div className="icon">📚</div>
                <span>Smart Learning</span>
              </div> */}

              <div className="status-badge">Showing 1 result</div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}