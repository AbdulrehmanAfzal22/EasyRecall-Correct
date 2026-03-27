// app/api/skipcash/diagnostics/route.js
// Diagnostic endpoint to check Skipcash configuration and connectivity

import { NextResponse } from 'next/server';

export async function GET() {
  // Trim all env vars to remove accidental spaces
  const KEYID = process.env.SKIPCASH_KEYID?.trim() || '';
  const SECRET = process.env.SKIPCASH_SECRET?.trim() || '';

  // Determine correct base URL
  const isSandbox = process.env.SKIPCASH_API?.includes('skipcashtest');
  const SKIPCASH_BASE = isSandbox
    ? 'https://skipcashtest.azurewebsites.net'
    : 'https://api.skipcash.app';
  const SKIPCASH_API = `${SKIPCASH_BASE}/api/v1/payments`;

  const diagnostics = {
    environment: {
      SKIPCASH_BASE,
      SKIPCASH_API,
      isSandbox,
      SKIPCASH_KEYID_set: !!KEYID,
      SKIPCASH_KEYID_length: KEYID.length,
      SKIPCASH_SECRET_set: !!SECRET,
      SKIPCASH_SECRET_length: SECRET.length,
      SKIPCASH_CLIENTKEY_set: !!process.env.SKIPCASH_CLIENTKEY?.trim(),
      SKIPCASH_WEBHOOKKEY_set: !!process.env.SKIPCASH_WEBHOOKKEY?.trim(),
      SKIPCASH_MODE: process.env.SKIPCASH_MODE || 'live',
    },
    nodeVersion: process.version,
  };

  // Check if credentials are configured
  if (!KEYID || !SECRET) {
    diagnostics.warning = 'Missing SKIPCASH_KEYID or SKIPCASH_SECRET in environment variables';
  }

  // Try to reach the Skipcash API (OPTIONS or HEAD request)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Try HEAD request first
    let response;
    try {
      response = await fetch(SKIPCASH_BASE, {
        method: 'HEAD',
        signal: controller.signal,
      });
    } catch (headErr) {
      // If HEAD fails, try GET on the API endpoint
      response = await fetch(SKIPCASH_API, {
        method: 'GET',
        signal: controller.signal,
      });
    }

    clearTimeout(timeout);

    diagnostics.apiReachability = {
      reachable: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
    };
  } catch (err) {
    diagnostics.apiReachability = {
      reachable: false,
      error: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 3),
    };
  }

  // Test DNS resolution if possible
  try {
    const dns = await import('dns');
    const lookup = dns.promises.lookup;
    const { address } = await lookup('api.skipcash.app');
    diagnostics.dnsResolution = {
      success: true,
      ip: address,
    };
  } catch (dnsErr) {
    diagnostics.dnsResolution = {
      success: false,
      error: dnsErr.message,
    };
  }

  return NextResponse.json(diagnostics);
}