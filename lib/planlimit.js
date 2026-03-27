// ============================================================
//  PLAN LIMITS — edit this file to change any limit
//  Location: lib/planLimits.js
// ============================================================

export const PLAN_LIMITS = {
  //  ── Monthly plan ($1.00) ────────────────────────────────
  monthly: {
    uploads: 1,        // max file uploads per billing cycle
    chats:   10,       // max chat messages per billing cycle
    label:   "Pro Monthly ($1.00)",
    price:   1.00,
  },

  //  ── Yearly plan ($2.00) ─────────────────────────────────
  yearly: {
    uploads: 40,       // max file uploads per billing cycle
    chats:   200,      // max chat messages per billing cycle
    label:   "Premium Yearly ($2.00)",
    price:   2.00,
  },

  //  ── Owner / bypass emails (always unlimited) ─────────────
  ownerEmails: [
    "musa@gmail.com",
    // add more admin emails here
  ],
};

// ── Helper: get limits for a plan key ───────────────────────
export function getLimits(planKey) {
  return PLAN_LIMITS[planKey] ?? PLAN_LIMITS.monthly;
}

// ── Helper: check if email bypasses all limits ───────────────
export function isOwner(email) {
  return PLAN_LIMITS.ownerEmails.includes(email?.toLowerCase());
}