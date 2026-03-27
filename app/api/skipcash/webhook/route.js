// app/api/skipcash/webhook/route.js
// Webhook handler for Skipcash payment notifications.
// Verifies the signature and records the payment in Firestore.

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../../../../lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

async function verifySignature(body, signature, secret) {
  // Reconstruct the exact body that was signed
  const computedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return computedSignature === signature;
}

// Extract plan from Custom1 field (e.g., "EasyRecall Premium Subscription - Yearly ($9.99) - Plan: yearly")
function extractPlanFromCustom1(custom1) {
  if (!custom1) return 'monthly';
  if (custom1.includes('yearly') || custom1.includes('Yearly')) return 'yearly';
  if (custom1.includes('monthly') || custom1.includes('Monthly')) return 'monthly';
  return 'monthly';
}

// Get subscription expiration date based on plan
function getSubscriptionExpiration(plan) {
  const now = new Date();
  if (plan === 'yearly') {
    now.setDate(now.getDate() + 365);
  } else {
    // Monthly plan
    now.setDate(now.getDate() + 30);
  }
  return new Date(now.getTime()); // Ensure it's a proper Date object for Firestore
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
      
      // Extract plan from Custom1 field
      const custom1 = metadata?.Custom1 || '';
      const plan = extractPlanFromCustom1(custom1);
      const expiresAt = getSubscriptionExpiration(plan);

      // Record the payment in Firestore
      const paymentDoc = {
        sessionId: session_id,
        amount,
        currency,
        customerId: customer_id,
        metadata,
        plan,
        status: 'completed',
        createdAt: serverTimestamp(),
        expiresAt,
        source: 'skipcash',
      };

      const paymentRef = doc(db, 'payments', session_id);
      await setDoc(paymentRef, paymentDoc, { merge: true });

      // Update user subscription status in Firestore
      if (customer_id) {
        const userRef = doc(db, 'users', customer_id);
        
        // Update main user subscription doc
        await updateDoc(userRef, {
          subscription: {
            status: 'active',
            plan: plan,
            paidAt: serverTimestamp(),
            lastPaymentAt: serverTimestamp(),
            expiresAt,
            sessionId: session_id,
            amount,
          },
          'er_plan_paid': true,
        }).catch((err) => {
          // User may not exist yet; log but don't fail
          console.warn('Could not update user subscription', { customerId: customer_id, err });
        });

        // Also update the usage document with the new plan and reset counters
        const now = new Date();
        const cycleKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const usageRef = doc(db, 'users', customer_id, 'usage', cycleKey);
        
        // Reset usage counters to 0 and set the new plan - COMPLETE OVERWRITE (no merge)
        await setDoc(usageRef, {
          uploads: 0,
          chats: 0,
          plan: plan,
          createdAt: serverTimestamp(),
        }).catch((err) => {
          console.warn('Could not update usage for new subscription', { customerId: customer_id, err });
        });
      }

      console.log('Payment recorded and subscription activated', { 
        sessionId: session_id, 
        amount, 
        plan,
        customerId: customer_id,
        expiresAt,
      });
      return NextResponse.json({ ok: true });
    }

    if (event.type === 'payment.failed') {
      const { session_id, reason } = event;
      console.warn('Payment failed webhook', { sessionId: session_id, reason });

      // Record the failure
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
