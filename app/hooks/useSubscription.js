import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../page/AuthProvider';

/**
 * useSubscription - Hook to subscribe to realtime updates of the
 * user's subscription document.
 * Returns: { subscription, loading, error }
 * subscription = { status, plan, paidAt, expiresAt, sessionId, amount }
 *
 * This replaces the previous one‑time fetch with an onSnapshot listener so
 * UI can react immediately when the webhook/optimistic update writes the
 * record.
 */
export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.data();
        if (data?.subscription) {
          const subData = { ...data.subscription };

          // convert Firestore timestamps to Date objects
          ['expiresAt', 'paidAt', 'lastPaymentAt'].forEach((field) => {
            if (subData[field] && typeof subData[field] === 'object' && 'toDate' in subData[field]) {
              subData[field] = subData[field].toDate();
            }
          });

          // normalize expired state
          if (subData.expiresAt && new Date() > new Date(subData.expiresAt)) {
            subData.status = 'expired';
          }

          setSubscription(subData);
        } else {
          setSubscription(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Subscription listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, authLoading]);

  return { subscription, loading, error };
}

export default useSubscription;
