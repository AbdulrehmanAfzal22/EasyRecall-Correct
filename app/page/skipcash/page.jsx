"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../AuthProvider.jsx";
import "./skipcash.css";

export default function SkipCashPayment() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [amount,       setAmount]       = useState(1.00);
  const [plan,         setPlan]         = useState("monthly");
  const [error,        setError]        = useState("");
  
  const effectRan = useRef(false);

  useEffect(() => {
    const amt = Number(searchParams.get("amount"));
    if (!isNaN(amt) && amt > 0) setAmount(amt);
    
    const planParam = searchParams.get("plan");
    if (planParam) setPlan(planParam);
  }, [searchParams]);

  useEffect(() => {
    // Only attempt if not loading, user exists, and we haven't already run this
    if (authLoading || !user || effectRan.current) return;
    
    // Check if amount and plan have been initialized from URL properly
    // At this point we are assuming the first render/useEffect for params has happened
    effectRan.current = true;
    
    const handlePay = async () => {
      try {
        const res  = await fetch("/api/skipcash/create-session", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ 
            amount, 
            plan,
            userId: user?.uid,
            userEmail: user?.email,
            userName: user?.displayName || "User",
          }),
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (data?.url) {
          window.location.href = data.url;
        } else {
          setError("Payment link not available. Please contact support.");
        }
      } catch (err) {
        setError("Network error while starting payment.");
      }
    };

    handlePay();
  }, [authLoading, user, amount, plan]);

  return (
    <div className="scc-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column' }}>
       {error ? (
         <div className="scc-error" style={{ padding: '20px', background: '#ffebee', color: '#c62828', borderRadius: '8px' }}>
           {error}
           <button onClick={() => router.push('/')} style={{display: 'block', marginTop: '10px'}}>Go Home</button>
         </div>
       ) : (
         <div style={{ textAlign: 'center', color: 'white' }}>
            <h2>Redirecting to Secure Payment...</h2>
            <div className="loading-dots show" style={{marginTop: '20px', display: 'flex', justifyContent: 'center'}}>
              <span /><span /><span />
            </div>
         </div>
       )}
    </div>
  );
}