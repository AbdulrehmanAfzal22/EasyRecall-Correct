"use client";
import { useState, useEffect } from "react";
import Sidebar from "./sidebar/page";
import "./layout-sidebar.css";
import "./dash-home/dashboard.css";
import { useAuth } from "../AuthProvider.jsx";
import { useSubscription } from "../../hooks/useSubscription";
import { useRouter, useSearchParams } from "next/navigation";

const OWNER_EMAILS = [
  "musa@gmail.com",
];

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isDark, setIsDark] = useState(false);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // subscription hook provides realtime data from Firestore
  const { subscription, loading: subLoading } = useSubscription();

  /* ─────────────────────────────────────────────
     1️⃣ Redirect if not logged in
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  /* ─────────────────────────────────────────────
     2️⃣ Detect theme
  ───────────────────────────────────────────── */
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  /* ─────────────────────────────────────────────
     3️⃣ Monitor Subscription (realtime via hook)
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (!loading && user) {
      const isOwner = OWNER_EMAILS.includes(user.email?.toLowerCase());
      if (isOwner) {
        setHasActivePlan(true);
        setShowUpgradeModal(false);
        return;
      }

      if (!subLoading) {
        const paid =
          subscription?.status === 'active' &&
          (!subscription.expiresAt || new Date(subscription.expiresAt) > new Date());
        setHasActivePlan(paid);
        setShowUpgradeModal(!paid);
      }
    }
  }, [loading, user, subscription, subLoading]);

  /* ─────────────────────────────────────────────
     4️⃣ Handle SkipCash Success

     When the payment provider redirects back with a successful status we
     still haven’t received the webhook (it can take several seconds).  The
     subscription check above may already have run and determined that the
     user is unpaid, which results in the upgrade modal reappearing while the
     customer is staring at the dashboard.  To prevent that we:

     • mark the local cache flag
     • immediately mark the layout state as paid
     • hide the modal
     • optionally write a lightweight ‘optimistic’ subscription record so
       Firestore reflects the success before the webhook arrives
  ───────────────────────────────────────────── */
  useEffect(() => {
    const status = searchParams.get("skipcash_status");
    const plan = searchParams.get("plan") || "monthly";

    if (status === "success" && user?.uid) {
      console.log("💳 PAYMENT SUCCESS", { userId: user.uid, plan });

      // immediately unlock the UI so the overlay disappears; the
      // realtime subscription listener will update shortly after the
      // optimistic mark-paid API call completes.
      setHasActivePlan(true);
      setShowUpgradeModal(false);

      // optimistic server update: if the webhook hasn’t fired yet this
      // ensures future subscription checks will see the active flag.
      fetch("/api/skipcash/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, plan }),
      }).catch((err) => {
        // ignore; webhook will still do the work later
        console.warn("optimistic subscription update failed", err);
      });

      fetch("/api/reset-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          plan,
        }),
      })
        .then(res => res.json())
        .then(data => {
          console.log("✅ Usage Reset:", data);

          // Clean URL without r load
          router.replace("/page/dashboard/dash-home");
        })
        .catch(err => {
          console.error("Reset failed:", err);
          router.replace("/page/dashboard/dash-home");
        });
    }
  }, [searchParams, user?.uid, router]);

  /* ─────────────────────────────────────────────
     5️⃣ Lock Scroll if Modal Open
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (showUpgradeModal && !hasActivePlan) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showUpgradeModal, hasActivePlan]);

  /* ─────────────────────────────────────────────
     Theme Toggle
  ───────────────────────────────────────────── */
  const toggleTheme = () => {
    const html = document.documentElement;
    const newIsDark = !isDark;

    if (newIsDark) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    setIsDark(newIsDark);
  };

  const handleUpgradeClick = () => {
    router.push("/page/pricing");
  };

  return (
    <div className={`dashboard-wrapper ${isDark ? "dark" : "light"}`}>
      <Sidebar isDark={isDark} onToggleTheme={toggleTheme} />

      <main className="dashboard-content">
        {children}
      </main>

      {showUpgradeModal && !hasActivePlan && (
        <div className="upgrade-overlay">
          <div className="upgrade-modal">
            <h2 className="upgrade-title">
              Upgrade your plan to use EasyRecall
            </h2>
            <p className="upgrade-text">
              Your account is created, but you need to activate a paid plan
              before you can access dashboard features.
            </p>

            <button className="upgrade-btn" onClick={handleUpgradeClick}>
              Upgrade plan to continue
            </button>

            <button
              className="upgrade-back-btn"
              onClick={() => router.push("/")}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}