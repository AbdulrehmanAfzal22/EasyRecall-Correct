// app/api/skipcash/create-session/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateSignature(data, secret) {
  // Skipcash uses HMAC SHA256 on the JSON string of the body
  return crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('base64');
}

export async function POST(req) {
  try {
    const body = await req.json();
    const amount = Number(body?.amount ?? 0);

    // Only allow hardcoded amounts for safety
    const allowed = [1.00, 2.00];
    if (!allowed.includes(amount)) {
      return NextResponse.json({ error: 'invalid_amount', amount }, { status: 400 });
    }

    const MODE = process.env.SKIPCASH_MODE || 'mock';

    // ───────────────────────────────────────────────────
    // MOCK MODE
    // ───────────────────────────────────────────────────
    if (MODE === 'mock') {
      const mockSessionId = `mock-${Date.now()}`;
      return NextResponse.json({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/skipcash-mock?amount=${amount}`,
        sessionId: mockSessionId,
        mode: 'mock',
      });
    }

    // ───────────────────────────────────────────────────
    // LIVE MODE - Fixed for Skipcash API
    // ───────────────────────────────────────────────────

    const KEYID = process.env.SKIPCASH_KEYID;
    const SECRET = process.env.SKIPCASH_SECRET;
    const CLIENT_ID = process.env.SKIPCASH_CLIENTKEY;

    // Use correct base URL (no trailing spaces!)
    const SKIPCASH_BASE = 'https://api.skipcash.app';

    if (!KEYID || !SECRET || !CLIENT_ID) {
      return NextResponse.json({
        error: 'misconfigured_provider',
        detail: 'Missing KEYID, SECRET, or CLIENTKEY'
      }, { status: 500 });
    }

    // Build correct payload per Skipcash docs
    const sessionData = {
      Uid: crypto.randomUUID(),
      KeyId: KEYID,
      Amount: amount.toFixed(2), // String with 2 decimals: "1.00"
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
      Custom1: body.custom1 || 'EasyRecall Premium',
    };

    const signature = generateSignature(sessionData, SECRET);

    console.log('Calling Skipcash API:', {
      url: `${SKIPCASH_BASE}/api/v1/payments`,
      keyId: KEYID,
      transactionId: sessionData.TransactionId,
    });

    const response = await fetch(`${SKIPCASH_BASE}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-KeyID': KEYID,
        'Authorization': signature, // Base64 encoded HMAC
      },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Skipcash API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'provider_error', status: response.status, detail: errorText },
        { status: 502 }
      );
    }

    const session = await response.json();

    // Skipcash returns payUrl in resultObj
    const payUrl = session.resultObj?.payUrl;

    if (!payUrl) {
      console.error('No payUrl in response:', session);
      return NextResponse.json(
        { error: 'missing_checkout_url', detail: session },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: payUrl,
      sessionId: session.resultObj?.id,
      mode: 'live',
    });

  } catch (err) {
    console.error('Session creation error:', err);
    return NextResponse.json(
      { error: 'server_error', detail: err.message },
      { status: 500 }
    );
  }
}