# EasyRecall Subscription System - Full Setup Guide

## Overview
This document outlines the complete subscription system with two pricing tiers:
- **$1.00/month**: 10 chats, 1 upload
- **$9.99/year**: 200 chats, 40 uploads

## What's Been Set Up

### 1. **Plan Limits** (`lib/planlimit.js`)
- Monthly plan ($1.00): 10 chats, 1 upload
- Yearly plan ($9.99): 200 chats, 40 uploads
- Owner email bypass (musa@gmail.com)

### 2. **Pricing Page** (`app/page/pricing/pricing.jsx`)
- Two pricing cards with IDs: "monthly" and "yearly"
- Plan ID passed to SkipCash checkout URL

### 3. **SkipCash Integration**
**Page** (`app/page/skipcash/page.jsx`):
- Receives plan and amount from query params
- Gets user info from Firebase Auth
- Passes plan to backend

**Create Session** (`app/api/skipcash/create-session/route.js`):
- Includes plan in Custom1 metadata
- Uses userId as customer_id for SkipCash
  - Validates only $1.00 and $9.99 amounts

**Webhook** (`app/api/skipcash/webhook/route.js`):
- Extracts plan from Custom1 field
- Calculates expiration date (30 days for monthly, 365 days for yearly)
- Stores subscription in Firebase: `users/{uid}/subscription`
- Updates usage document with plan
- Sets `er_plan_paid` flag for instant access

### 4. **Subscription Hook** (`app/hooks/useSubscription.js`)
- Listens to the user document in Firestore via `onSnapshot`
- Returns: `{ subscription, loading, error }`
- Handles Firestore Timestamp conversion
- Automatically updates when the webhook or optimistic update writes to Firestore
- Flags subscriptions as `expired` when `expiresAt` passes

### 5. **Dashboard** (`app/page/dashboard/layout.jsx`)
- Uses the realtime subscription hook to determine plan status
- No longer relies on localStorage caching
- Shows upgrade modal whenever there is no active (and unexpired) plan
- Optimistically hides the modal on redirect while the listener updates


### 6. **Usage Tracking** (`lib/usageService.js`)
- Tracks uploads and chats per billing cycle
- Enforces plan limits
- Respects owner bypass
- Provides remaining counts

---

## Firebase Schema

### Users Collection
```
users/{uid}
├── subscription
│   ├── status: "active" | "expired"
│   ├── plan: "monthly" | "yearly"
│   ├── paidAt: Timestamp
│   ├── expiresAt: Timestamp
│   ├── sessionId: string
│   └── amount: number
└── er_plan_paid: boolean
```

### Usage Collection (per billing cycle)
```
users/{uid}/usage/{YYYY-MM}
├── uploads: number (increments)
├── chats: number (increments)
├── plan: "monthly" | "yearly"
└── createdAt: Timestamp
```

### Payments Collection
```
payments/{sessionId}
├── sessionId: string
├── amount: number
├── currency: string
├── plan: "monthly" | "yearly"
├── customerId: string (uid)
├── metadata: object
├── status: "completed" | "failed"
├── createdAt: Timestamp
└── expiresAt: Timestamp
```

---

## Testing with Real Money

### Prerequisites
1. **SkipCash Account**: Ensure you have:
   - SKIPCASH_MODE=live (in .env.local)
   - SKIPCASH_KEYID
   - SKIPCASH_SECRET
   - SKIPCASH_CLIENTKEY
   - SKIPCASH_WEBHOOKKEY

2. **Firebase Project**: Configured with proper credentials

3. **Webhook Endpoint**: Ensure `/api/skipcash/webhook` is accessible from public internet

### Step-by-Step Testing

#### 1. Create Test Account
```
1. Go to http://localhost:3000 (or your app URL)
2. Sign up with a test email (e.g., test@example.com)
3. You'll see the upgrade modal (no localStorage flag is involved)
```

#### 2. Choose Plan & Checkout
```
1. Click "Upgrade Plan"
2. Select pricing plan ($1.00 monthly or $9.99 yearly)
3. Click "Get Started"
4. Enter payment details on SkipCash checkout
```

#### 3. Complete Payment
```
1. Use SkipCash test card details (if in sandbox mode)
2. Or use real card details (if in live mode)
3. Follow SkipCash payment flow
4. Confirm payment completion
```

#### 4. Verify in Firebase
After successful payment, check Firebase Console:

**Check 1: Payments Collection**
```
- Navigate to: payments/{sessionId}
- Verify "status" is "completed"
- Verify "plan" shows correct tier
```

**Check 2: User Document**
```
- Navigate to: users/{uid}
- Look for "subscription" object
- Verify "status" is "active"
- Verify "expiresAt" is set correctly
- Verify "plan" matches selected plan
```

**Check 3: Usage Document**
```
- Navigate to: users/{uid}/usage/{current-month}
- Verify "plan" field matches subscription
- uploads and chats should be 0 (just purchased)
```

#### 5. Verify Usage Limits
```
1. Go to dashboard
2. Upload a document
3. Check that uploads increment
4. Send chat message
5. Check that chats increment
6. Verify limits in Firestore usage doc
```

---

## Testing with Mock Mode

### Enable Mock Mode
```env
SKIPCASH_MODE=mock
```

### Test Flow
```
1. Create account (same as real testing)
2. Click upgrade
3. You'll be redirected to skipcash-mock.html
4. Click "Simulate Successful Payment"
5. You'll be redirected back to dashboard
```

**Note**: Mock mode doesn't trigger real webhooks. For full testing:
- Use the `/api/debug/mock-webhook` endpoint (if enabled)
- Or trigger webhook manually via Firebase Cloud Functions
- Or test with real SkipCash in sandbox mode

---

## Troubleshooting

### Issue: Subscription not updating after payment
**Solution**:
1. Check browser console for errors
2. Verify webhook credentials in .env.local
3. Check Firebase logs for webhook endpoint access
4. Manually verify Firebase documents were created

### Issue: Limits not enforcing
**Solution**:
1. Verify plan is set correctly in usage doc
2. Check planlimit.js has correct values
3. Clear browser cache and localStorage
4. Restart Next.js dev server

### Issue: User shows upgrade modal after payment
**Solution**:
1. Check subscription.status in Firebase
2. Verify expiresAt hasn't passed
3. Try clearing localStorage and refreshing
4. Check dashboard layout logic for Firebase fetch

---

## Integration Points

### When User Pays
1. `create-session` → Creates Skipcash session with plan & user ID
2. User completes payment on Skipcash
3. Skipcash calls webhook with payment.succeeded event
4. Webhook extracts plan from Custom1
5. Webhook creates/updates user subscription in Firebase
6. Webhook updates usage document with plan
7. Next time user accesses dashboard → Hook fetches subscription → Shows dashboard

### When Usage is Checked
1. API endpoint calls `checkAndIncrement(uid, email, field)`
2. Checks owner bypass first
3. Fetches current cycle usage from Firestore
4. Gets plan from usage doc → Gets limits from planlimit.js
5. If under limit → Increments and returns allowed=true
6. If over limit → Returns allowed=false

---

## Monitoring & Debugging

### View Subscription Status
```javascript
// In browser console
firebase.firestore().collection('users').doc(uid).get()
  .then(doc => console.log(doc.data().subscription))
```

### View Usage
```javascript
// Get current cycle usage
const now = new Date();
const cycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
firebase.firestore().collection('users').doc(uid)
  .collection('usage').doc(cycle).get()
  .then(doc => console.log(doc.data()))
```

### Check Payment Records
```javascript
// View all payments for debugging
firebase.firestore().collection('payments')
  .where('customerId', '==', uid).get()
  .then(snap => snap.docs.forEach(doc => console.log(doc.data())))
```

---

## Next Steps

### Optional Enhancements
- [ ] Add email notifications for payment confirmation
- [ ] Implement subscription renewal/upgrade flows
- [ ] Add admin dashboard to view subscriptions
- [ ] Set up automated subscription expiration handling
- [ ] Add invoice generation
- [ ] Implement refund handling
- [ ] Add subscription cancellation option

### Production Checklist
- [ ] Use HTTPS for webhook endpoint
- [ ] Implement request logging/monitoring
- [ ] Set up alerts for failed payments
- [ ] Regular backup of payments collection
- [ ] Document SLA for webhook retry logic
- [ ] Test disaster recovery procedures

