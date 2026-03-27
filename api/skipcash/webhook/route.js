// app/api/skipcash/webhook/route.js
// Webhook handler for Skipcash payment notifications.
// Verifies the signature and records the payment in Firestore.

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../../../lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

async function verifySignature(body, signature, secret) {
  // Reconstruct the exact body that was signed
  const computedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return computedSignature === signature;
}

export async function POST(req) {
  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-skipcash-signature');
    const secret = process.env.SKIPCASH_SECRET || '';

    if (!secret) {
      console.error('Missing SKIPCASH_SECRET for webhook verification');
      return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
    }

    // Verify the signature
    const isValid = await verifySignature(rawBody, signature, secret);
    if (!isValid) {
      console.error('Invalid Skipcash webhook signature', { signature });
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }

    // Parse the payload
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse webhook payload', e);
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    console.log('Skipcash webhook received', { eventType: event.type, sessionId: event.session_id });

    // Handle different event types
    if (event.type === 'payment.succeeded') {
      const { session_id, amount, currency, customer_id, metadata } = event;

      // Record the payment in Firestore
      // Assuming you have a "payments" collection
      const paymentDoc = {
        sessionId: session_id,
        amount,
        currency,
        customerId: customer_id,
        metadata,
        status: 'completed',
        createdAt: serverTimestamp(),
        source: 'skipcash',
      };

      const paymentRef = doc(db, 'payments', session_id);
      await setDoc(paymentRef, paymentDoc, { merge: true });

      // Optionally, update user subscription status in Firestore
      if (customer_id) {
        const userRef = doc(db, 'users', customer_id);
        await updateDoc(userRef, {
          subscription: {
            status: 'active',
            plan: metadata?.plan || 'premium',
            lastPaymentAt: serverTimestamp(),
            sessionId: session_id,
          },
        }).catch((err) => {
          // User may not exist yet; log but don't fail
          console.warn('Could not update user subscription', { customerId: customer_id, err });
        });
      }

      console.log('Payment recorded', { sessionId: session_id, amount });
      return NextResponse.json({ ok: true });
    }

    if (event.type === 'payment.failed') {
      const { session_id, reason } = event;
      console.warn('Payment failed webhook', { sessionId: session_id, reason });

      // You could record the failure or send an alert
      const failureDoc = {
        sessionId: session_id,
        status: 'failed',
        reason,
        failedAt: serverTimestamp(),
      };
      const failureRef = doc(db, 'payments', session_id);
      await setDoc(failureRef, failureDoc, { merge: true });

      return NextResponse.json({ ok: true });
    }

    // Acknowledge other event types
    console.log('Unhandled webhook event type', event.type);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook processing error', err);
    return NextResponse.json({ error: 'server_error', detail: String(err) }, { status: 500 });
  }
}
