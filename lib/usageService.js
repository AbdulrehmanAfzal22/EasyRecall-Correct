// ============================================================
//  Usage Tracking Service
//  Location: lib/usageService.js
//
//  Firestore structure:
//  users/{uid}/usage/{cycleKey}  →  { uploads: N, chats: N, plan: "monthly"|"yearly" }
//
//  cycleKey = "2025-06"  (year-month of the current billing cycle)
// ============================================================

import { db } from "./firebase"; // adjust path if needed
import { doc, getDoc, setDoc, increment, updateDoc } from "firebase/firestore";
import { getLimits, isOwner } from "@/lib/planlimit";

// Returns the current billing cycle key (YYYY-MM)
function getCycleKey() { 
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Read current usage ──────────────────────────────────────
export async function getUsage(uid) {
  const cycle = getCycleKey();
  const ref = doc(db, "users", uid, "usage", cycle);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { uploads: 0, chats: 0, plan: "monthly", cycle };
  return { ...snap.data(), cycle };
}

// ── Increment a counter and check against limit ─────────────
//  field:  "uploads" | "chats"
//  Returns: { allowed: boolean, used: number, limit: number }
export async function checkAndIncrement(uid, email, field) {
  // Owner bypass — always allowed, no tracking
  if (isOwner(email)) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const cycle = getCycleKey();
  const ref = doc(db, "users", uid, "usage", cycle);

  // Get or create the usage doc
  const snap = await getDoc(ref);
  let data = snap.exists() ? snap.data() : { uploads: 0, chats: 0, plan: "monthly" };

  const plan = data.plan ?? "monthly";
  const limits = getLimits(plan);
  const current = data[field] ?? 0;

  if (current >= limits[field]) {
    // Limit hit — don't increment
    return { allowed: false, used: current, limit: limits[field], plan, label: limits.label };
  }

  // Increment in Firestore
  if (snap.exists()) {
    await updateDoc(ref, { [field]: increment(1) });
  } else {
    await setDoc(ref, { uploads: 0, chats: 0, plan: "monthly", [field]: 1 });
  }

  return { allowed: true, used: current + 1, limit: limits[field], plan, label: limits.label };
}

// ── Set the user's plan (call this after payment) ───────────
export async function setUserPlan(uid, planKey) {
  const cycle = getCycleKey();
  const ref = doc(db, "users", uid, "usage", cycle);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { plan: planKey });
  } else {
    await setDoc(ref, { uploads: 0, chats: 0, plan: planKey });
  }
}

// ── Get remaining counts for display ────────────────────────
export async function getRemaining(uid, email) {
  if (isOwner(email)) {
    return { uploads: Infinity, chats: Infinity, plan: "owner", label: "Owner" };
  }
  const usage = await getUsage(uid);
  const limits = getLimits(usage.plan);
  return {
    uploads:      Math.max(0, limits.uploads - (usage.uploads ?? 0)),
    chats:        Math.max(0, limits.chats   - (usage.chats   ?? 0)),
    uploadLimit:  limits.uploads,
    chatLimit:    limits.chats,
    plan:         usage.plan,
    label:        limits.label,
  };
}