// app/api/skipcash/mark-paid/route.js
// Lightweight endpoint called when the user is redirected back to the
// dashboard after a successful Skipcash payment.  This lets the client
// update Firestore immediately (optimistically) so that subsequent
// subscription checks will see an active plan even if the webhook hasn't
// been delivered yet.

import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
  try {
    const body = await req.json();
    const { userId, plan } = body || {};
    if (!userId) {
      return NextResponse.json({ error: 'missing_userId' }, { status: 400 });
    }

    const expiresAt = getSubscriptionExpiration(plan || 'monthly');
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      subscription: {
        status: 'active',
        plan: plan || 'monthly',
        paidAt: serverTimestamp(),
        lastPaymentAt: serverTimestamp(),
        expiresAt,
      },
      er_plan_paid: true,
    }).catch((err) => {
      // ignore - user may not exist yet or could get created by webhook later
      console.warn('optimistic mark-paid update failed', err);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('mark-paid error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
