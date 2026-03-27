// payment-auth-check.js

/*
  This snippet prevents users from accessing payment functionality unless they are signed in.
  Use this logic in your payment page/component.
*/

import { useAuth } from "../app/page/AuthProvider.jsx";
import { useRouter } from "next/navigation";

export function PaymentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (!loading && !user) {
    // Redirect to sign-in before allowing payment
    router.replace("/login");
    return null;
  }

  // ...payment UI and logic here...
}

/*
  Usage:
  - Place PaymentPage as your payment entry point.
  - If user is not signed in, they will be redirected to login before seeing payment options.
*/
