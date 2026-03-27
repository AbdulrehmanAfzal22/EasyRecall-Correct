"use client";

import { useRouter } from "next/navigation";
import Pricing from "./pricing"
import "./price.css";

export default function PricingPage() {
  const router = useRouter();

  const handleClose = () => {
    // Go back to previous page (e.g., dashboard)
    router.back();
  };

  return (
    <div className="pricing-standalone">
      <button className="pricing-back-btn" onClick={handleClose}>
        ← Back
      </button>
      <Pricing />
    </div>
  );
}

