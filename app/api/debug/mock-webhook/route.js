// app/api/debug/mock-webhook/route.js
// ⚠️ DEBUG ENDPOINT ONLY - Remove in production!
// This endpoint allows testing the webhook flow without real SkipCash payments

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../../../../lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Only enable in development
const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

async function verifySignature(body, signature, secret) {
  const computedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return computedSignature === signature;
}

function extractPlanFromCustom1(custom1) {
  if (!custom1) return 'monthly';
  if (custom1.includes('yearly') || custom1.includes('Yearly')) return 'yearly';
  if (custom1.includes('monthly') || custom1.includes('Monthly')) return 'monthly';
  return 'monthly';
}

function getSubscriptionExpiration(plan) {
  const now = new Date();
  if (plan === 'yearly') {
    now.setDate(now.getDate() + 365);
  } else {
    now.setDate(now.getDate() + 30);
  }
  return new Date(now.getTime());
}

export async function POST(req) {
  // Only allow in development
  if (!DEBUG_ENABLED) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.userId || !body.plan || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, plan, amount' },
        { status: 400 }
      );
    }

    // Validate plan
    if (body.plan !== 'monthly' && body.plan !== 'yearly') {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Validate amount
    if ((body.plan === 'monthly' && body.amount !== 1.00) || 
        (body.plan === 'yearly' && body.amount !== 2.00)) {
      return NextResponse.json(
        { error: `Invalid amount for ${body.plan} plan` },
        { status: 400 }
      );
    }

    const sessionId = `debug-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const expiresAt = getSubscriptionExpiration(body.plan);

    // Record the payment
    const paymentDoc = {
      sessionId,
      amount: body.amount,
      currency: 'USD',
      customerId: body.userId,
      plan: body.plan,
      status: 'completed',
      createdAt: new Date(),
      expiresAt,
      source: 'debug-mock',
      metadata: {
        debug: true,
        Custom1: `EasyRecall Premium Subscription - ${body.plan === 'yearly' ? 'Yearly ($2.00)' : 'Monthly ($1.00)'} - Plan: ${body.plan}`,
      },
    };

    const paymentRef = doc(db, 'payments', sessionId);
    await setDoc(paymentRef, paymentDoc, { merge: true });

    // Update user subscription
    const userRef = doc(db, 'users', body.userId);
    await updateDoc(userRef, {
      subscription: {
        status: 'active',
        plan: body.plan,
        paidAt: new Date(),
        lastPaymentAt: new Date(),
        expiresAt,
        sessionId,
        amount: body.amount,
      },
      er_plan_paid: true,
    }).catch(async (err) => {
      if (err.code === 'not-found') {
        // Create user doc if it doesn't exist
        await setDoc(userRef, {
          subscription: {
            status: 'active',
            plan: body.plan,
            paidAt: new Date(),
            lastPaymentAt: new Date(),
            expiresAt,
            sessionId,
            amount: body.amount,
          },
          er_plan_paid: true,
        });
      } else {
        throw err;
      }
    });

    // Update usage document and reset counters to 0
    const now = new Date();
    const cycleKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageRef = doc(db, 'users', body.userId, 'usage', cycleKey);

    // Reset usage counters to 0 and set the new plan - COMPLETE OVERWRITE (no merge)
    await setDoc(usageRef, {
      uploads: 0,
      chats: 0,
      plan: body.plan,
      createdAt: new Date(),
    }).catch((err) => {
      console.warn('Could not update usage for new subscription', { userId: body.userId, err });
    });

    console.log('✅ DEBUG: Mock webhook processed successfully', {
      sessionId,
      userId: body.userId,
      plan: body.plan,
      amount: body.amount,
      expiresAt,
    });

    return NextResponse.json({
      ok: true,
      message: 'Mock payment processed successfully',
      sessionId,
      subscription: {
        status: 'active',
        plan: body.plan,
        expiresAt,
      },
    });
  } catch (err) {
    console.error('DEBUG: Mock webhook error', err);
    return NextResponse.json(
      { error: 'Server error', detail: err.message },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(req) {
  if (!DEBUG_ENABLED) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    message: 'Debug mock webhook endpoint',
    method: 'POST',
    body: {
      userId: 'firebase-uid-here',
      plan: 'monthly or yearly',
      amount: '1.00 or 9.99',
    },
    example: {
      userId: 'abc123def456',
      plan: 'monthly',
      amount: 1.00,
    },
  });
}
