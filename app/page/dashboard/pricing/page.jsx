"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../AuthProvider";
import "./pricing.css";

export default function PricingSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const showUpgradeBack = searchParams.get("from") === "upgrade";

  const handlePurchase = async (amount, planId = "monthly") => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (user) {
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
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />

      {showUpgradeBack && (
        <button
          type="button"
          className="pricing-back-btn"
          onClick={() => router.back()}
        >
          ← Back
        </button>
      )}
      <div className="pricing-wrapper">
        <div className="pricing-header-group">
          <div className="pricing-eyebrow">Pricing</div>
          <h2 className="main-title">Start Learning Smarter Today</h2>
          <p className="main-subtitle">
            Choose the plan that best fits your study needs.
          </p>
        </div>

        <div className="pricing-cards-grid">
          {/* Monthly Card */}
          <div className="pricing-card pricing-card-monthly">
            <div className="card-glow glow-blue" />
            <div className="card-top-bar bar-blue" />

            <div className="card-header">
              <div>
                <span className="plan-eyebrow">Monthly</span>
                <h3 className="plan-title">Pro</h3>
              </div>
              <span className="badge badge-popular">Popular</span>
            </div>

            <div className="price-block">
              <span className="currency">$</span>
              <span className="amount">1</span>
              <span className="amount-cents">.00</span>
              <div className="price-meta">
                <span className="billing-period">/mo</span>
                <span className="price-sub">Billed monthly</span>
              </div>
            </div>

            <ul className="feature-list">
              {features.map((f, i) => (
                <li key={i}>
                  <span className="check-bubble check-blue">✓</span>
                  <span>{f}</span>
                </li>
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
              className="start-button btn-blue"
              onClick={() => handlePurchase(1.0, "monthly")}
              disabled={isProcessing}
            >
              {isProcessing ? "Redirecting..." : <>Get Started Monthly <span className="btn-arrow">→</span></>}
            </button>
          </div>

          {/* Yearly Card */}
          <div className="pricing-card pricing-card-yearly">
            <div className="card-glow glow-violet" />
            <div className="card-top-bar bar-violet" />

            <div className="card-header">
              <div>
                <span className="plan-eyebrow">Yearly</span>
                <h3 className="plan-title">Premium</h3>
              </div>
              <span className="badge badge-recommended">Save 20%</span>
            </div>

            <div className="price-block">
              <span className="currency">$</span>
              <span className="amount">9</span>
              <span className="amount-cents">.99</span>
              <div className="price-meta">
                <span className="billing-period">/yr</span>
                <span className="price-sub">Billed yearly</span>
              </div>
            </div>

            <ul className="feature-list">
              {features.map((f, i) => (
                <li key={i}>
                  <span className="check-bubble check-violet">✓</span>
                  <span>{f}</span>
                </li>
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
              className="start-button btn-violet"
              onClick={() => handlePurchase(9.99, "yearly")}
              disabled={isProcessing}
            >
              {isProcessing ? "Redirecting..." : <>Get Started Yearly <span className="btn-arrow">→</span></>}
            </button>
          </div>
        </div>

        <div className="pricing-footer-note">
          Cancel anytime. Secure checkout.
        </div>
      </div>
    </section>

  );
}





