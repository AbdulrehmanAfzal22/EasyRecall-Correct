"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./price.css";

// Import your auth hook — adjust path if needed
import { useAuth } from "../AuthProvider.jsx";

export default function SubscriptionPricing() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [themeDark, setThemeDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setThemeDark(isDarkMode);
  }, []);

  const handleThemeToggle = () => {
    const html = document.documentElement;
    const newIsDark = !themeDark;
    if (newIsDark) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setThemeDark(newIsDark);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (amount, planId) => {
    // Still loading auth state — wait
    if (loading || isProcessing) return;

    if (user) {
      // ✅ Already logged in (coming from dashboard) — go straight to payment gateway
      setIsProcessing(true);
      try {
        const res = await fetch("/api/skipcash/create-session", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
              amount,
              plan: planId,
              userId: user.uid,
              userEmail: user.email,
              userName: user.displayName || "User"
           })
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (data.url) {
           window.location.href = data.url;
        } else {
           setIsProcessing(false);
           alert("Could not start payment.");
        }
      } catch (err) {
         setIsProcessing(false);
         alert("Network error while starting payment.");
      }
    } else {
      // 🔒 Not logged in (coming from landing page) — sign up first, then SkipCash pass-through
      const paymentUrl = `/page/skipcash?amount=${amount}&plan=${planId}`;
      const redirectUrl = `/page/signup?redirect=${encodeURIComponent(paymentUrl)}`;
      router.push(redirectUrl);
    }
  };

  const features = [
    "Unlimited document uploads",
    "Unlimited quiz generations",
    "Up to 40 questions per quiz",
    "Instant answer feedback",
    "Performance tracking & insights",
    "View source during quizzes",
    "Export quiz & study data",
    "Priority email support",
    "Unlimited flashcard decks (40 cards each)",
  ];

  return (
    <section className="pricing-hero">
      <div className="pricing-wrapper">
        <h2 className="main-title">Start Learning Smarter Today</h2>
        <p className="main-subtitle">Choose the plan that best fits your study needs.</p>

        <div className="pricing-cards-grid">
          {/* Monthly Card */}
          <div className="pricing-card-monthly">
            <div className="card-header">
              <h3 className="plan-title">Premium Monthly</h3>
              <span className="badge-popular">Popular</span>
            </div>

            <div className="price-block">
              <span className="currency">$</span>
              <span className="amount">1.00</span>
              <span className="billing-period">/mo</span>
            </div>

            <ul className="feature-list">
              {features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <div className="limits-section">
              <div className="limit-row">
                <span>Max file size</span>
                <span>10 MB / document</span>
              </div>
              <div className="limit-row">
                <span>Monthly quizzes</span>
                <span>Unlimited</span>
              </div>
            </div>

            <button
              className="start-button"
              onClick={() => handlePurchase(1.00, "monthly")}
              disabled={loading || isProcessing}
            >
              {loading ? "Loading..." : isProcessing ? "Redirecting..." : "Get Started Monthly"}
            </button>
          </div>

          {/* Yearly Card */}
          <div className="pricing-card-yearly">
            <div className="card-header">
              <h3 className="plan-title">Premium Monthly
              </h3>
              <span className="badge-recommended">Save 20%</span>
            </div>

            <div className="price-block">
              <span className="currency">$</span>
              <span className="amount">2.00</span>
              <span className="billing-period">/yr</span>
            </div>

            <ul className="feature-list">
              {features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <div className="limits-section">
              <div className="limit-row">
                <span>Max file size</span>
                <span>10 MB / document</span>
              </div>
              <div className="limit-row">
                <span>Monthly quizzes</span>
                <span>Unlimited</span>
              </div>
            </div>

            <button
              className="start-button"
              onClick={() => handlePurchase(2.00, "yearly")}
              disabled={loading || isProcessing}
            >
              {loading ? "Loading..." : isProcessing ? "Redirecting..." : "Get Started Yearly"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}