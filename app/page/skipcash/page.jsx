"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "../AuthProvider.jsx";
import "./skipcash.css";

/* ══════════════════════════════════════
   ICONS
══════════════════════════════════════ */
const IconUser = () => (
  <svg fill="none" viewBox="0 0 16 16" width="14" height="14">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconMail = () => (
  <svg fill="none" viewBox="0 0 16 16" width="14" height="14">
    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M1 6l7 4 7-4" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const IconCard = () => (
  <svg fill="none" viewBox="0 0 16 16" width="14" height="14">
    <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M1 7h14" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const IconCalendar = () => (
  <svg fill="none" viewBox="0 0 16 16" width="14" height="14">
    <rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M1 6h14M5 1v2M11 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconShield = () => (
  <svg fill="none" viewBox="0 0 16 16" width="14" height="14">
    <path d="M8 1.5L2 4v4c0 3.5 2.5 6.4 6 7 3.5-.6 6-3.5 6-7V4L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const IconCheck = () => (
  <svg fill="none" viewBox="0 0 12 12" width="9" height="9">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconCheckBig = () => (
  <svg fill="none" viewBox="0 0 40 40" width="36" height="36">
    <path d="M10 20l8 8 14-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconLock = () => (
  <svg fill="none" viewBox="0 0 20 20" width="16" height="16">
    <path d="M10 1.5L2 5v5.5c0 4.4 3.1 8 8 8.5 4.9-.5 8-4.1 8-8.5V5L10 1.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconArrowLeft = () => (
  <svg fill="none" viewBox="0 0 16 16" width="13" height="13">
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconClock = () => (
  <svg fill="none" viewBox="0 0 14 14" width="11" height="11">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M7 4v4l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const IconZap = () => (
  <svg fill="none" viewBox="0 0 14 14" width="11" height="11">
    <path d="M8 1L2 8h6l-2 5 6-7H6l2-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ══════════════════════════════════════
   CONSTANTS
══════════════════════════════════════ */
const FEATURES = [
  "5 projects per month",
  "500 MB asset storage",
  "Basic templates",
  "Community support",
  "Upgrade anytime",
];

const TABS = [
  {
    key: "card",
    label: "Card",
    icon: (
      <svg fill="none" viewBox="0 0 16 16" width="12" height="12">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M1 7h14" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  // {
  //   key: "paypal",
  //   label: "PayPal",
  //   icon: (
  //     <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
  //       <path d="M11 3H6.5A4 4 0 006.5 11H7l-.5 3H9l1.5-9.5A1.5 1.5 0 0011 3z" stroke="currentColor" strokeWidth="1.3" />
  //     </svg>
  //   ),
  // },
  // {
  //   key: "google",
  //   label: "G Pay",
  //   icon: (
  //     <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
  //       <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.3" />
  //       <path d="M8 8h4M8 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  //     </svg>
  //   ),
  // },
];

const TAB_BTN_TEXT = {
  card:   "Activate  Plan",

};

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function SkipCashPayment() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  /* ── Theme — synced with your existing navbar system ── */
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read from html.dark class — same as Navbar
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = useCallback(() => {
    const html     = document.documentElement;
    const newDark  = !isDark;
    if (newDark) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDark(newDark);
  }, [isDark]);

  /* ── Payment state ── */
  const [activeTab,    setActiveTab]    = useState("card");
  const [amount,       setAmount]       = useState(1.00);
  const [plan,         setPlan]         = useState("monthly");
  const [cardNumber,   setCardNumber]   = useState("");
  const [cardHolder,   setCardHolder]   = useState("");
  const [cardNetwork,  setCardNetwork]  = useState("VISA");
  const [cardBrand,    setCardBrand]    = useState("");
  const [brandVisible, setBrandVisible] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [showOverlay,  setShowOverlay]  = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => {
    const amt = Number(searchParams.get("amount"));
    if (!isNaN(amt) && (amt === 1.00 || amt === 2.00)) setAmount(amt);
    
    const planParam = searchParams.get("plan");
    if (planParam === "monthly" || planParam === "yearly") setPlan(planParam);
  }, [searchParams]);

  /* ── Card number formatting ── */
  const handleCardNumber = (e) => {
    let v = e.target.value.replace(/\D/g, "").substring(0, 16);
    setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
    if (v.startsWith("4")) {
      setCardBrand("VISA"); setCardNetwork("VISA"); setBrandVisible(true);
    } else if (/^5[1-5]/.test(v)) {
      setCardBrand("MC"); setCardNetwork("MC"); setBrandVisible(true);
    } else if (v.startsWith("34") || v.startsWith("37")) {
      setCardBrand("AMEX"); setCardNetwork("AMEX"); setBrandVisible(true);
    } else {
      setBrandVisible(false); setCardNetwork("VISA");
    }
  };

  const handleExpiry = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 2) v = v.substring(0, 2) + " / " + v.substring(2, 4);
    e.target.value = v;
  };

  const displayNumber = (() => {
    const raw = cardNumber.replace(/\s/g, "").padEnd(16, "•");
    return raw.match(/.{1,4}/g)?.join(" ") ?? "•••• •••• •••• ••••";
  })();

  /* ── Pay handler ── */
  const handlePay = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/skipcash/create-session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ 
          amount, 
          plan,
          userId: user?.uid,
          userEmail: user?.email,
          userName: user?.displayName || cardHolder,
        }),
      });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; }
      catch { data = { text }; }

      if (!res.ok) {
        setError("Could not start payment. Please try again.");
        return;
      }

      if (data?.url) {
        // we no longer cache a flag in localStorage; the dashboard listens
        // to Firestore changes instead. just navigate to the payment page.
        window.location.href = data.url;
      } else {
        setError("Payment link not available. Please contact support.");
      }
    } catch {
      setError("Network error while starting payment.");
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="scc-page">
      <div className="bg-mesh" />
      <div className="grid-lines" />

      {/* ══ TOP BAR ══ */}
      <div className="scc-topbar">
        {/* Back */}
        <button className="scc-back-btn" onClick={() => router.back()}>
          <IconArrowLeft />
          Back
        </button>

        {/* Center title */}
        <div className="scc-topbar-center">
          {/* <div className="scc-topbar-logo">S</div> */}
          <span className="scc-topbar-name">EasyRecall</span>
          <span className="scc-topbar-tag">Checkout</span>
        </div>

        {/* Theme toggle — same logic as your Navbar */}
        <button className="scc-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
          {isDark ? "Light" : "Dark"}
        </button>
      </div>

      {/* ══ PAYMENT CARD ══ */}
      <div className="payment-wrap">

        {/* ════ LEFT PANEL ════ */}
        <div className="panel-left">
          <div className="panel-blob" />

          <div className="brand">
            {/* <div className="brand-icon">S</div> */}
            <div className="brand-name">EasyRecall</div>
          </div>

          <div className="plan-summary">
            {/* <div className="plan-tag">
              <span className="plan-tag-dot" />
              Starter Plan
            </div> */}

            <div className="plan-name">Start Creating<br />Today</div>
            <div className="plan-tagline">Everything you need to Learn, practice &amp; more.</div>

            <div className="plan-price-block">
              <div className="plan-price-label">You're paying</div>
              <div className="plan-price-main">
                <span className="plan-curr">$</span>
                <span className="plan-amount">{amount.toFixed(2)}</span>
              </div>
              <div className="plan-cycle">per month · always free</div>
              {/* <div className="plan-save">✦ Secure via SkipCash</div> */}
            </div>

            <div className="plan-features">
              {FEATURES.map((f) => (
                <div className="plan-feat" key={f}>
                  <div className="feat-check"><IconCheck /></div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* <div className="secure-note">
            <IconShield />
            256-bit SSL · Powered by Stripe
          </div> */}
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div className="panel-right">
          <div className="panel-header">
            <h2>Complete Your Setup</h2>
            <p>Enter your details to activate your Starter account.</p>
          </div>

          {/* Live card visual */}
          {activeTab === "card" && (
            <div className="card-visual">
              <div className="card-top">
                <div className="card-chip" />
                <div className="card-network">{cardNetwork}</div>
              </div>
              <div className="card-bottom">
                <div className="card-number-display">{displayNumber}</div>
                <div className="card-holder-display">{cardHolder.toUpperCase() || "YOUR NAME"}</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="pay-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`pay-tab${activeTab === t.key ? " active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Card form ── */}
          {activeTab === "card" && (
            <div>
              <div className="form-row">
                <label className="scc-label">Full Name</label>
                <div className="input-wrap">
                  <span className="input-icon"><IconUser /></span>
                  <input type="text" className="scc-input" placeholder="Alex Johnson" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <label className="scc-label">Email Address</label>
                <div className="input-wrap">
                  <span className="input-icon"><IconMail /></span>
                  <input type="email" className="scc-input" placeholder="alex@example.com" />
                </div>
              </div>

              {/* <div className="form-row">
                <label className="scc-label">Card Number</label>
                <div className="input-wrap">
                  <span className="input-icon"><IconCard /></span>
                  <input type="text" className="scc-input card-input" placeholder="1234 5678 9012 3456" maxLength={19} value={cardNumber} onChange={handleCardNumber} />
                  <span className={`card-brand-badge${brandVisible ? " visible" : ""}`}>{cardBrand}</span>
                </div>
              </div> */}

              {/* <div className="form-row-2">
                <div>
                  <label className="scc-label">Expiry</label>
                  <div className="input-wrap">
                    <span className="input-icon"><IconCalendar /></span>
                    <input type="text" className="scc-input card-input" placeholder="MM / YY" maxLength={7} onChange={handleExpiry} />
                  </div>
                </div>
                <div>
                  <label className="scc-label">CVV</label>
                  <div className="input-wrap">
                    <span className="input-icon"><IconShield /></span>
                    <input type="text" className="scc-input card-input" placeholder="•••" maxLength={4} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, ""); }} />
                  </div>
                </div>
              </div> */}
            </div>
          )}

          {/* ── PayPal form ── */}
          {activeTab === "paypal" && (
            <div>
              <div className="form-row">
                <label className="scc-label">PayPal Email</label>
                <div className="input-wrap">
                  <span className="input-icon"><IconMail /></span>
                  <input type="email" className="scc-input" placeholder="your@paypal.com" />
                </div>
              </div>
              <div className="info-box">
                You'll be redirected to PayPal to authorize securely. No PayPal account needed — any card works.
              </div>
            </div>
          )}

          {/* ── Google Pay form ── */}
          {activeTab === "google" && (
            <div className="info-box-center">
              <div className="gpay-logo">G</div>
              <div className="gpay-title">Google Pay</div>
              Click below to authorize via Google Pay using your saved cards securely.
            </div>
          )}

          {/* Pay button */}
          <button
            className={`pay-btn${loading ? " loading" : ""}${success ? " success" : ""}`}
            onClick={handlePay}
            disabled={loading}
          >
            <IconLock />
            <span>{success ? "✓ Success!" : TAB_BTN_TEXT[activeTab]}</span>
            {loading && (
              <div className="loading-dots show">
                <span /><span /><span />
              </div>
            )}
          </button>

          {error && <div className="scc-error">{error}</div>}

          {/* Trust */}
          {/* <div className="trust-row">
            <div className="trust-item"><IconShield /> SSL Secure</div>
            <div className="trust-item"><IconClock /> Cancel Anytime</div>
            <div className="trust-item"><IconZap /> Instant Access</div>
          </div> */}
        </div>

        {/* ════ SUCCESS OVERLAY ════ */}
        {showOverlay && (
          <div className="success-overlay">
            <div className="success-ring"><IconCheckBig /></div>
            <h2>You're All Set! 🎉</h2>
            <p>
              Your Starter account is ready.<br />
              Start creating — no limits on your creativity.
            </p>
            <div className="success-ref">REF: SCC-2026-FREE-7741</div>
            <button className="back-btn-overlay" onClick={() => router.push("/dashboard")}>
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}