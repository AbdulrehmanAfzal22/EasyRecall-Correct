// app/api/skipcash/ping/route.js
// Diagnostic endpoint: attempts a lightweight HEAD request to the configured SKIPCASH_BASE
// and returns detailed error information to help debug DNS/network issues.

import { NextResponse } from 'next/server';

export async function GET() {
  const SKIPCASH_BASE = process.env.SKIPCASH_BASE || process.env.NEXT_PUBLIC_SKIPCASH_BASE || 'https://checkout.skipcash.io/checkout';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(SKIPCASH_BASE, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);

    return NextResponse.json({ ok: true, status: res.status, statusText: res.statusText });
  } catch (err) {
    const name = err && err.name ? err.name : undefined;
    const message = err && err.message ? err.message : String(err);
    const stack = err && err.stack ? err.stack : undefined;
    console.error('Skipcash ping failed', { name, message, stack, SKIPCASH_BASE });
    return NextResponse.json({ ok: false, name, message, stack, host: SKIPCASH_BASE }, { status: 502 });
  }
}
