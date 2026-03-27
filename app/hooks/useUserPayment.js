// useUserPayment.js
// Hook to check if user has paid subscription

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export function useUserPayment(user) {
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasPaid(false);
      setLoading(false);
      return;
    }
    async function checkPayment() {
      setLoading(true);
      try {
        const paymentsRef = collection(db, "users", user.uid, "payments");
        const snap = await getDocs(paymentsRef);
        setHasPaid(!snap.empty);
      } catch {
        setHasPaid(false);
      }
      setLoading(false);
    }
    checkPayment();
  }, [user]);

  return { hasPaid, loading };
}
