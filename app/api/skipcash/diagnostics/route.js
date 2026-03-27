// app/api/skipcash/diagnostics/route.js
// Diagnostic endpoint to check Skipcash configuration and connectivity

import { NextResponse } from 'next/server';

export async function GET() {
  const KEYID = process.env.SKIPCASH_KEYID || '';
  const SECRET = process.env.SKIPCASH_SECRET || '';
  const SKIPCASH_API = process.env.SKIPCASH_API || 'https://api.skipcash.io/v1/checkout/sessions';

  const diagnostics = {
    environment: {
      SKIPCASH_API,
      SKIPCASH_KEYID_set: !!KEYID,
      SKIPCASH_SECRET_set: !!SECRET,
      SKIPCASH_CLIENTKEY_set: !!process.env.SKIPCASH_CLIENTKEY,
      SKIPCASH_WEBHOOKKEY_set: !!process.env.SKIPCASH_WEBHOOKKEY,
    },
    nodeVersion: process.version,
  };

  // Try to reach the Skipcash API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(SKIPCASH_API, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    diagnostics.apiReachability = {
      reachable: true,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (err) {
    diagnostics.apiReachability = {
      reachable: false,
      error: err.message,
      code: err.code,
      name: err.name,
    };
  }

  // Check if credentials are configured
  if (!KEYID || !SECRET) {
    diagnostics.warning = 'Missing SKIPCASH_KEYID or SKIPCASH_SECRET in environment variables';
  }

  return NextResponse.json(diagnostics);
}
