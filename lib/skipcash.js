// lib/skipcash.js
// Minimal helper to build a Skipcash checkout URL.
// Replace the base URL if your Skipcash checkout endpoint differs.

// Skipcash base URL can be configured via NEXT_PUBLIC_SKIPCASH_BASE
// Example: NEXT_PUBLIC_SKIPCASH_BASE=https://checkout.skipcash.io/checkout
const SKIPCASH_BASE = process.env.NEXT_PUBLIC_SKIPCASH_BASE || "https://checkout.skipcash.app/checkout";

// TODO: move keys to env vars for production; using NEXT_PUBLIC_ so client-side can read them
const CLIENT_KEY = process.env.NEXT_PUBLIC_SKIPCASH_CLIENTKEY || "a902e0a0-ab82-453e-94f9-ef0da98bfe42";
const WEBHOOK_KEY = process.env.NEXT_PUBLIC_SKIPCASH_WEBHOOKKEY || "901d601f-6dd2-4a99-8509-eb9b70c0a368";

function toCents(amount) {
  // Accept numbers or numeric strings like "4.99" and convert to integer cents
  const n = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function buildSkipcashUrl({ amount, currency = "USD", description = "EasyRecall Premium" } = {}) {
  const params = new URLSearchParams();
  params.set("clientkey", CLIENT_KEY);
  params.set("webhookkey", WEBHOOK_KEY);

  // Send amount in cents as integer (some payment providers expect cents)
  const cents = toCents(amount);
  params.set("amount", String(cents));

  // Also include a human-readable display amount
  params.set("display_amount", String(amount));
  params.set("currency", currency);
  params.set("description", description);

  return `${SKIPCASH_BASE}?${params.toString()}`;
}

export default buildSkipcashUrl;
