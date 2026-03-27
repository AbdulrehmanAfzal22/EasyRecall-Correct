// Script to batch update old users in Firestore with subscription info
// Fill in the userIds array and plan details as needed

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();


// List of user IDs to update
const userIds = [
  'mf6DlbiuAaT5qWJo4wF5XudHeN42',
  'HJGcedPhZKenQmK4NfQvao4Ha4w1',
  // ...
];

// Plan details to assign
const plan = 'monthly'; // or 'yearly', etc.
const now = new Date();
const expiresAt = new Date(now);
expiresAt.setMonth(now.getMonth() + 1); // 1 month from now

async function updateUsers() {
  if (!userIds.length) {
    console.log('No user IDs provided.');
    return;
  }

  const usersRef = db.collection('users');
  for (const userId of userIds) {
    const userRef = usersRef.doc(userId);
    await userRef.set({
      subscription: {
        status: 'active',
        plan,
        paidAt: FieldValue.serverTimestamp(),
        lastPaymentAt: FieldValue.serverTimestamp(),
        expiresAt,
      },
      er_plan_paid: true,
    }, { merge: true });
    console.log(`Updated user: ${userId}`);
  }
  console.log('All users updated.');
}

updateUsers().catch(console.error);
