# Quick Start: Testing Subscription System

## 🚀 5-Minute Testing Guide

### Option 1: Test with Debug Endpoint (Fastest)

**Perfect for: Quick testing, development, CI/CD**

#### Step 1: Trigger Mock Payment
```bash
# Monthly plan ($1.00)
curl -X POST http://localhost:3000/api/debug/mock-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_FIREBASE_UID_HERE",
    "plan": "monthly",
    "amount": 1.00
  }'

# OR Yearly plan ($9.99)
curl -X POST http://localhost:3000/api/debug/mock-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_FIREBASE_UID_HERE",
    "plan": "yearly",
    "amount": 9.99
  }'
```

#### Step 2: Verify in Firebase
- Go to Firebase Console → Firestore
- Check `users/{uid}/subscription` → Should show active plan
- Check `users/{uid}/usage/{YYYY-MM}` → Should show plan

#### Step 3: Test in App
- Refresh dashboard
- Check that usage limits are enforced
- Try uploading files (should count against limit)

---

### Option 2: Test with Real SkipCash (Full Flow)

**Perfect for: Final testing, production validation, real money**

#### Step 1: Create Test Account
```
1. Go to http://localhost:3000/
2. Signup with test email
3. Dashboard will show "Upgrade your plan" modal
```

#### Step 2: Start Checkout
```
1. Click "Upgrade plan"
2. Choose "$1.00 Monthly" or "$9.99 Yearly"
3. Click "Get Started"
4. You'll be redirected to SkipCash checkout
```

#### Step 3: Complete Payment
```
On SkipCash checkout:
- Enter cardholder name
- Enter email
- (Mock mode: Click "Activate Plan")
- (Real mode: Enter real card details)
```

#### Step 4: Verify Success
After payment completes:
- Check browser console for any errors
- Dashboard should load (no upgrade modal)
- Go to Firebase Console
- Verify `users/{uid}/subscription` is active
- Check `payments/{sessionId}` exists

---

### Option 3: Test Mock Mode (No Real Payment)

**Perfect for: Integration testing, automated tests**

```bash
# 1. Enable mock mode in .env.local
SKIPCASH_MODE=mock

# 2. Restart dev server

# 3. Follow exact flow from "Option 2: Test with Real SkipCash"
# 4. On SkipCash checkout page, click "Simulate Successful Payment"
# 5. Should redirect back to dashboard
```

---

## 🔍 Verification Checklist

### After Each Payment Test:

- [ ] ✅ Upgrade modal is gone
- [ ] ✅ User can upload files
- [ ] ✅ User can send chat messages
- [ ] ✅ Firebase `users/{uid}/subscription` shows active
- [ ] ✅ Firebase `users/{uid}/usage/{YYYY-MM}` shows correct plan
- [ ] ✅ Firebase `payments/{sessionId}` shows completed status

### Upload/Chat Limits:

**Monthly ($1.00)**: 1 upload, 10 chats
```bash
# Test: Try uploading 2 files, 2nd should be rejected
```

**Yearly ($9.99)**: 40 uploads, 200 chats
```bash
# Test: Try uploading 41 files, 41st should be rejected
```

---

## 🐛 Troubleshooting

### Payment fails with "invalid_amount"
- ✅ Check you're using $1.00 or $9.99 exactly
- ✅ Check SKIPCASH_MODE in .env.local

### Subscription not appearing after payment
- ✅ Wait 5-10 seconds (webhook processing)
- ✅ Refresh browser page (F5)
- ✅ Check Firebase Console for errors
- ✅ Check browser console for JS errors
- ✅ Verify user.uid is correct in SkipCash

### Upload/chat limits not enforcing
- ✅ Refresh browser completely (Ctrl+Shift+R)
- ✅ Clear localStorage: `localStorage.clear()`
- ✅ Check planlimit.js has correct values
- ✅ Verify usage document in Firebase has correct plan

### Mock webhook returns "Not available in production"
- ✅ Only works in NODE_ENV=development
- ✅ Remove .next cache: `rm -rf .next`
- ✅ Restart Next.js dev server

---

## 📊 Firebase Structure to Check

### After Successful Payment:

**Collection: payments**
```
payments/{sessionId}
├── sessionId: "abc123..."
├── amount: 1.00 or 9.99
├── plan: "monthly" or "yearly"
├── customerId: "firebase-uid"
├── status: "completed"
└── expiresAt: Date (now + 30 or 365 days)
```

**Collection: users**
```
users/{uid}
├── subscription
│   ├── status: "active"
│   ├── plan: "monthly" or "yearly"
│   ├── expiresAt: Date (now + 30 or 365 days)
│   └── sessionId: "..."
└── er_plan_paid: true
```

**Collection: users/{uid}/usage**
```
users/{uid}/usage/{2025-01}
├── uploads: 0 (increments as user uploads)
├── chats: 0 (increments as user chats)
├── plan: "monthly" or "yearly"
└── createdAt: Date
```

---

## 🧪 Advanced Testing

### Test Subscription Expiration
```bash
# Open browser console and set:
localStorage.setItem('test_expired', 'true')

# Modify usageService.js getRemaining() to add:
if (localStorage.getItem('test_expired')) {
  return { uploads: 0, chats: 0, plan: 'expired' }
}
```

### Test Multiple Upgrades
```
1. Create 2 test accounts
2. Each subscribe to different plans
3. Verify each has correct limits
4. Switch plans (create new payment)
```

### Monitor Network Requests
```
1. Open DevTools → Network tab
2. Trigger webhook tester endpoint
3. Watch for:
   - POST to /api/debug/mock-webhook
   - Response status 200
4. Check Console for "DEBUG: Mock webhook processed"
```

---

## 📝 Quick Reference URLs

**Development**:
- App: http://localhost:3000
- Dashboard: http://localhost:3000/page/dashboard
- Pricing: http://localhost:3000/page/pricing
- Checkout: http://localhost:3000/page/skipcash
- Firebase Console: https://console.firebase.google.com

**Debug Endpoints**:
- Test webhook: POST to /api/debug/mock-webhook (dev only)
- Mock checkout: /skipcash-mock.html

---

## ✅ You're Ready!

1. Set your Firebase UID as an environment variable
2. Choose testing method (options 1, 2, or 3 above)
3. Follow the steps
4. Verify in Firebase Console
5. Test upload/chat limits
6. All set! 🎉

