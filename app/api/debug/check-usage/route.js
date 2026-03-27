// app/api/debug/check-usage/route.js
// DEBUG: Check current usage for a user

import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'missing_userId' },
        { status: 400 }
      );
    }

    // Get current cycle key (YYYY-MM)
    const now = new Date();
    const cycleKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check usage doc
    const usageRef = doc(db, 'users', userId, 'usage', cycleKey);
    const usageSnap = await getDoc(usageRef);

    if (!usageSnap.exists()) {
      return NextResponse.json({
        found: false,
        userId,
        cycleKey,
        message: 'No usage doc found for this cycle',
      });
    }

    const usageData = usageSnap.data();

    return NextResponse.json({
      found: true,
      userId,
      cycleKey,
      usage: usageData,
      uploads: usageData.uploads ?? 'undefined',
      chats: usageData.chats ?? 'undefined',
      plan: usageData.plan ?? 'undefined',
    });
  } catch (err) {
    console.error('Error checking usage', err);
    return NextResponse.json(
      { error: 'server_error', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
