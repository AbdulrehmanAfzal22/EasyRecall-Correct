// app/api/skipcash/create-session/route.js
// Production server-side Skipcash session creation.
// Creates a session via Skipcash API using KEYID/SECRET and returns the checkout URL.

import { NextResponse } from 'next/server';
import crypto from 'crypto';

function toCents(amount) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

// Skipcash signs a comma-separated key=value string of NON-EMPTY fields in strict order.
// It does NOT sign the JSON body.
// Reference: Skipcash Integration Manual
const SKIPCASH_FIELD_ORDER = [
  'Uid', 'KeyId', 'Amount', 'FirstName', 'LastName', 'Phone',
  'Email', 'Street', 'City', 'State', 'Country', 'PostalCode',
  'TransactionId', 'Custom1',
];

function generateSignature(data, secret) {
  // Build comma-separated key=value string (non-empty fields only, strict order)
  const signString = SKIPCASH_FIELD_ORDER
    .filter(key => data[key] !== undefined && data[key] !== null && data[key] !== '')
    .map(key => `${key}=${data[key]}`)
    .join(',');

  console.log('[Skipcash] Signing string:', signString);
  // Use the KeySecret as-is (plain string HMAC key) → Base64 output
  return crypto.createHmac('sha256', secret).update(signString).digest('base64');
}

// Fetch with timeout fallback for older Node versions
async function fetchWithTimeout(url, options, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const amount = Number(body?.amount ?? 0);
    const plan = body?.plan || "monthly"; // "monthly" or "yearly"
    const userId = body?.userId || null;
    const userEmail = body?.userEmail || "customer@example.com";
    const userName = body?.userName || "Customer";

    // Only allow hardcoded amounts for safety
    const allowed = [1.00, 2.00, 9.99];
    if (!allowed.includes(amount)) {
      console.warn('Invalid amount requested', { amount, allowed });
      return NextResponse.json({ error: 'invalid_amount', amount }, { status: 400 });
    }

    const origin = new URL(req.url).origin;
    const MODE = process.env.SKIPCASH_MODE || 'live'; // 'mock' or 'live' (default: live)

    // ───────────────────────────────────────────────────
    // MOCK MODE: Return simulated checkout URL (for development)
    // ───────────────────────────────────────────────────
    if (MODE === 'mock') {
      const mockSessionId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const mockCheckoutUrl = `${origin}/skipcash-mock.html?amount=${amount}&sessionId=${mockSessionId}&return_url=${encodeURIComponent(`${origin}/dashboard?skipcash_status=success&plan=${plan}`)}&plan=${plan}&userId=${userId || ''}`;

      console.log('✓ MOCK MODE: Returning simulated checkout', {
        mode: 'mock',
        sessionId: mockSessionId,
        amount,
        plan,
        userId,
        url: mockCheckoutUrl,
      });

      return NextResponse.json({
        url: mockCheckoutUrl,
        sessionId: mockSessionId,
        mode: 'mock',
      });
    }

    // ───────────────────────────────────────────────────
    // LIVE MODE: Call real Skipcash API
    // ───────────────────────────────────────────────────

    // Read credentials from server env (NEVER expose to client)
    const KEYID = process.env.SKIPCASH_KEYID?.trim() || '';
    const SECRET = process.env.SKIPCASH_SECRET?.trim() || '';

    // Correct Skipcash endpoint: /api/v1/payments
    // Production: https://api.skipcash.app/api/v1/payments
    // Sandbox:    https://skipcashtest.azurewebsites.net/api/v1/payments
    const SKIPCASH_BASE = process.env.SKIPCASH_API?.includes('skipcashtest')
      ? 'https://skipcashtest.azurewebsites.net'
      : 'https://api.skipcash.app';
    const SKIPCASH_API = `${SKIPCASH_BASE}/api/v1/payments`;

    if (!KEYID || !SECRET) {
      console.error('Missing Skipcash credentials', { hasKeyId: !!KEYID, hasSecret: !!SECRET });
      return NextResponse.json({ error: 'misconfigured_provider', detail: 'Missing KEYID or SECRET' }, { status: 500 });
    }

    // Build correct payload per Skipcash /api/v1/payments docs
    const returnUrl = `${origin}/page/dashboard/dash-home?skipcash_status=success&plan=${plan}`;
    const sessionData = {
      Uid: userId || crypto.randomUUID(),
      KeyId: KEYID,
      Amount: amount.toFixed(2),
      FirstName: userName.split(' ')[0] || 'Customer',
      LastName: userName.split(' ')[1] || 'User',
      Phone: body.phone || '+97400000000',
      Email: userEmail,
      Street: body.street || 'PO Box 000',
      City: body.city || 'Doha',
      State: body.state || 'DA',
      Country: body.country || 'QA',
      PostalCode: body.postalCode || '00000',
      TransactionId: body.transactionId || `order-${Date.now()}`,
      Custom1: `EasyRecall Premium Subscription - ${plan === 'yearly' ? 'Yearly ($2.00)' : 'Monthly ($1.00)'} - Plan: ${plan}`,
      ReturnUrl: returnUrl,
    };

    // Generate signature for authentication
    const signature = generateSignature(sessionData, SECRET);

    console.log('Creating Skipcash LIVE session', {
      mode: 'live',
      amount,
      SKIPCASH_API,
      hasKeyId: !!KEYID,
      hasSecret: !!SECRET,
    });

    // Call Skipcash API — 30s timeout, retry once on timeout/network error
    let response;
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-KeyID': KEYID,
        'Authorization': signature,
      },
      body: JSON.stringify(sessionData),
    };

    try {
      response = await fetchWithTimeout(SKIPCASH_API, fetchOptions, 30000);
    } catch (fetchErr) {
      // On timeout/network error, retry once
      if (fetchErr.name === 'AbortError' || fetchErr.code === 20) {
        console.warn('Skipcash API timed out, retrying once...', { url: SKIPCASH_API });
        try {
          response = await fetchWithTimeout(SKIPCASH_API, fetchOptions, 30000);
        } catch (retryErr) {
          console.error('Skipcash API failed after retry', { error: retryErr.message });
          return NextResponse.json(
            { error: 'api_unreachable', detail: retryErr.message },
            { status: 502 }
          );
        }
      } else {
        console.error('Fetch to Skipcash API failed', {
          url: SKIPCASH_API,
          error: fetchErr.message,
          code: fetchErr.code,
          name: fetchErr.name,
        });
        return NextResponse.json(
          { error: 'api_unreachable', detail: fetchErr.message },
          { status: 502 }
        );
      }
    }


    if (!response.ok) {
      const responseText = await response.text();
      console.error('Skipcash API error response', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500),
      });
      return NextResponse.json(
        { error: 'provider_error', status: response.status, detail: responseText.substring(0, 200) },
        { status: 502 }
      );
    }

    let session;
    try {
      session = await response.json();
    } catch (parseErr) {
      console.error('Failed to parse Skipcash response', parseErr);
      return NextResponse.json({ error: 'invalid_response', detail: 'Provider returned invalid JSON' }, { status: 502 });
    }

    // Extract payUrl from resultObj (Skipcash specific response structure)
    const payUrl = session.resultObj?.payUrl;
    if (!payUrl) {
      console.error('Skipcash session missing payUrl', { session });
      return NextResponse.json(
        { error: 'missing_pay_url', detail: 'Provider response missing resultObj.payUrl', session },
        { status: 500 }
      );
    }

    console.log('✓ Skipcash LIVE session created successfully', { url: payUrl });
    return NextResponse.json({ url: payUrl, mode: 'live' });
  } catch (err) {
    console.error('Session creation error', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    return NextResponse.json(
      { error: 'server_error', detail: err.message },
      { status: 500 }
    );
  }
}
