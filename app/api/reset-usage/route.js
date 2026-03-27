// app/api/reset-usage/route.js
// API to manually reset usage counters for current billing cycle
// Called after successful payment to ensure fresh counts

import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, plan } = body;

    if (!userId) {
      console.error('Reset usage: missing userId');
      return NextResponse.json(
        { error: 'missing_user_id' },
        { status: 400 }
      );
    }

    // Get current cycle key (YYYY-MM)
    const now = new Date();
    const cycleKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log('🔄 Resetting usage for user', { userId, cycleKey, plan });

    // Reset usage for current billing cycle - COMPLETELY overwrite the doc
    const usageRef = doc(db, 'users', userId, 'usage', cycleKey);
    
    // Delete old doc first, then set fresh one (ensures clean state)
    const freshData = {
      uploads: 0,
      chats: 0,
      plan: plan || 'monthly',
      lastResetAt: serverTimestamp(),
      resetCount: 1,
    };

    // Use setDoc without merge to completely replace
    await setDoc(usageRef, freshData);

    // Verify the reset worked
    const verifySnap = await getDoc(usageRef);
    const verifyData = verifySnap.data();
    
    console.log('✓ Usage reset successful', { 
      userId, 
      cycleKey, 
      plan,
      verifiedData: verifyData
    });

    return NextResponse.json({
      ok: true,
      message: 'Usage counters reset successfully',
      userId,
      cycleKey,
      plan,
      verifiedData,
    });
  } catch (err) {
    console.error('❌ Error resetting usage', err?.message || err);
    return NextResponse.json(
      { error: 'server_error', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
