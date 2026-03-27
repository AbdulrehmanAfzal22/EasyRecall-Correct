// app/api/skipcash/create-session/route.js
// Production server-side Skipcash session creation.
// Uses official Skipcash API: POST /api/v1/payments

import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Generate signature according to Skipcash docs
// The signature should be HMAC SHA256 of the JSON body
// Skipcash expects hex encoding (not base64) based on common implementations
function generateSignature(data, secret) {
  const jsonString = JSON.stringify(data);
  console.log('Generating signature for:', jsonString);
  // Try hex first (more common), if that fails we can try base64
  return crypto.createHmac('sha256', secret).update(jsonString).digest('hex');
}

// Alternative: Base64 signature if hex doesn't work
function generateSignatureBase64(data, secret) {
  const jsonString = JSON.stringify(data);
  return crypto.createHmac('sha256', secret).update(jsonString).digest('base64');
}

// Fetch with timeout
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
    const plan = body?.plan || 'monthly';
    const userId = body?.userId || null;

    const plan = body?.plan || 'monthly';
    // Only allow hardcoded amounts for safety
    const allowed = [1.00, 2.00];
    if (!allowed.includes(amount)) {
      console.warn('Invalid amount requested', { amount, allowed });
      return NextResponse.json({ error: 'invalid_amount', amount }, { status: 400 });
    }

    const origin = new URL(req.url).origin;
    const MODE = process.env.SKIPCASH_MODE || 'live';

    // ───────────────────────────────────────────────────
    // MOCK MODE
    // ───────────────────────────────────────────────────
    if (MODE === 'mock') {
      const mockSessionId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const mockCheckoutUrl = `${origin}/skipcash-mock.html?amount=${amount}&sessionId=${mockSessionId}&return_url=${encodeURIComponent(`${origin}/page/dashboard/dash-home?skipcash_status=success&plan=${body.plan || 'monthly'}`)}`;

      console.log('✓ MOCK MODE: Returning simulated checkout', {
        mode: 'mock',
        sessionId: mockSessionId,
        amount,
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

    const KEYID = process.env.SKIPCASH_KEYID?.trim() || '';
    const SECRET = process.env.SKIPCASH_SECRET?.trim() || '';

    // Hardcode correct endpoint - NO trailing spaces!
    const SKIPCASH_API = 'https://api.skipcash.app/api/v1/payments';

    if (!KEYID || !SECRET) {
      console.error('Missing Skipcash credentials', { hasKeyId: !!KEYID, hasSecret: !!SECRET });
      return NextResponse.json({ error: 'misconfigured_provider', detail: 'Missing KEYID or SECRET' }, { status: 500 });
    }

    // Build correct payload per Skipcash docs
    const sessionData = {
      Uid: crypto.randomUUID(),
      KeyId: KEYID,
      Amount: amount.toFixed(2),
      FirstName: body.firstName || 'Customer',
      LastName: body.lastName || 'User',
      Phone: body.phone || '+97400000000',
      Email: body.email || 'customer@example.com',
      Street: body.street || 'PO Box 000',
      City: body.city || 'Doha',
      State: body.state || 'DA',
      Country: body.country || 'QA',
      PostalCode: body.postalCode || '00000',
      TransactionId: body.transactionId || `order-${Date.now()}`,
      Custom1: body.custom1 || 'EasyRecall Premium Subscription',
    };

    // Generate signature - try hex encoding (more standard for HMAC)
    const signature = generateSignature(sessionData, SECRET);

    console.log('Signature (hex):', signature);
    console.log('Signature (base64) for comparison:', generateSignatureBase64(sessionData, SECRET));

    console.log('Creating Skipcash LIVE session', {
      mode: 'live',
      amount: sessionData.Amount,
      transactionId: sessionData.TransactionId,
      api: SKIPCASH_API,
      keyId: KEYID,
      signatureLength: signature.length,
    });

    // Call Skipcash API
    let response;
    try {
      response = await fetchWithTimeout(SKIPCASH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-KeyID': KEYID,
          'X-Signature': signature,  // Try X-Signature header instead of Authorization
        },
        body: JSON.stringify(sessionData),
      }, 10000);
    } catch (fetchErr) {
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

    // If first attempt fails with 403, try with base64 signature
    if (response.status === 403) {
      console.log('Trying with base64 signature...');
      const base64Signature = generateSignatureBase64(sessionData, SECRET);

      try {
        response = await fetchWithTimeout(SKIPCASH_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-KeyID': KEYID,
            'X-Signature': base64Signature,
          },
          body: JSON.stringify(sessionData),
        }, 10000);
      } catch (fetchErr) {
        console.error('Second fetch attempt failed', fetchErr);
      }
    }

    // Handle non-OK responses
    if (!response.ok) {
      const responseText = await response.text();
      console.error('Skipcash API error response', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 1000),
      });
      return NextResponse.json(
        { error: 'provider_error', status: response.status, detail: responseText },
        { status: 502 }
      );
    }

    // Parse response
    let session;
    try {
      session = await response.json();
    } catch (parseErr) {
      console.error('Failed to parse Skipcash response', parseErr);
      return NextResponse.json({ error: 'invalid_response', detail: 'Provider returned invalid JSON' }, { status: 502 });
    }

    console.log('Skipcash raw response:', session);

    // Extract payUrl from resultObj
    const payUrl = session.resultObj?.payUrl;

    if (!payUrl) {
      console.error('Skipcash session missing payUrl', { session });
      return NextResponse.json(
        { error: 'missing_checkout_url', detail: 'Provider response missing resultObj.payUrl', response: session },
        { status: 500 }
      );
    }

    console.log('✓ Skipcash LIVE session created successfully', {
      url: payUrl,
      paymentId: session.resultObj?.id,
      transactionId: sessionData.TransactionId
    });

    return NextResponse.json({
      url: payUrl,
      sessionId: session.resultObj?.id,
      transactionId: sessionData.TransactionId,
      mode: 'live'
    });

  } catch (err) {
    console.error('Session creation error', {
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: 'server_error', detail: err.message },
      { status: 500 }
    );
  }
}