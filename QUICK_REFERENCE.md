# 🚀 Quick Reference: Subscription System

## ⚡ 60-Second Setup

1. **Ensure SkipCash credentials in `.env.local`**:
   ```env
   SKIPCASH_MODE=live  # or "mock" for development
   SKIPCASH_KEYID=...
   SKIPCASH_SECRET=...
   ```

2. **Restart dev server**:
   ```bash
   npm run dev
   ```

3. **You're ready to test!**

---

## 🧪 Test in 3 Steps

### Step 1: Create Account
```
1. Go to localhost:3000
2. Sign up (get Firebase UID from browser console: `firebase.auth().currentUser.uid`)
3. Dashboard should show upgrade modal
```

### Step 2: Trigger Payment
**Option A: Debug Endpoint (Fastest)**
```bash
curl -X POST http://localhost:3000/api/debug/mock-webhook \
   -H "Content-Type: application/json" \
   -d '{"userId":"YOUR_UID","plan":"monthly","amount":1.00}'
```

**Option B: Real SkipCash**
```
1. Click "Upgrade plan" in modal
2. Choose $1.00 or $9.99
3. Complete SkipCash payment
```

### Step 3: Verify
- [ ] Refresh dashboard - no upgrade modal
- [ ] Firestore: `users/{uid}/subscription` is active
- [ ] Firestore: `users/{uid}/usage/{YYYY-MM}` has plan
- [ ] Try uploading/chat - limits enforced

---

## 📊 Plan Limits

| Plan | Price | Uploads | Chats |
|------|-------|---------|-------|
| Monthly | $1.00 | 1 | 10 |
| Yearly | $9.99 | 40 | 200 |

---

## 🔧 Key Files Modified

```
✏️ lib/planlimit.js              → Updated limits
✏️ app/page/pricing/pricing.jsx  → Pass plan ID
✏️ app/page/skipcash/page.jsx    → Send user + plan
✏️ app/api/skipcash/create-session/route.js → Include plan
✏️ app/api/skipcash/webhook/route.js → Store subscription
✏️ app/page/dashboard/layout.jsx → Check Firebase
✨ app/hooks/useSubscription.js  → Fetch subscription
✨ app/api/debug/mock-webhook/route.js → Test endpoint
```

---

## 🎯 Where Data Lives

**After payment succeeds:**

```javascript
// Users collection
db.collection('users').doc(uid).data()
→ subscription: { status, plan, expiresAt, ... }

// Payments collection  
db.collection('payments').doc(sessionId).data()
→ { sessionId, amount, plan, customerId, status, ... }

// Usage per cycle
db.collection('users').doc(uid).collection('usage').doc('2025-03').data()
→ { uploads, chats, plan }
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Subscription missing after payment | Wait 10s, refresh, check console |
| Limits not enforced | Clear localStorage, refresh |
| Webhook endpoint not working | Check .env.local credentials |
| Can't upload/chat | Check Firebase for plan in usage doc |

---

## 📝 Essential Commands

```bash
# View your Firebase UID (browser console)
firebase.auth().currentUser.uid

# Check subscription (browser console)
db.collection('users').doc('YOUR_UID').get().then(d => console.log(d.data().subscription))

# Check usage (browser console)
const now = new Date(); const m = String(now.getMonth()+1).padStart(2,'0'); 
db.collection('users').doc('YOUR_UID').collection('usage').doc(now.getFullYear()+'-'+m).get().then(d => console.log(d.data()))

# Clear all localStorage
localStorage.clear()

# Trigger mock webhook
curl -X POST http://localhost:3000/api/debug/mock-webhook -H "Content-Type: application/json" -d '{"userId":"ID","plan":"monthly","amount":1.00}'
```

---

## ✨ What's New

- ✅ Two pricing tiers ($1.00, $9.99)
- ✅ Firebase subscription storage
- ✅ Usage limit enforcement  
- ✅ SkipCash payment integration
- ✅ Automatic plan activation
- ✅ Debug testing endpoint
- ✅ Complete documentation

---

## 🚨 Important Notes

1. **Debug endpoint** (`/api/debug/mock-webhook`) only works in development
2. **Webhook needs public internet access** for real SkipCash
3. **Test credentials** needed for SkipCash sandbox mode
4. **localStorage** might override Firebase - clear if issues

---

## 📞 Need Help?

1. Read: `SUBSCRIPTION_SETUP.md` (detailed guide)
2. Read: `TESTING_GUIDE.md` (step-by-step testing)
3. Read: `CHANGES_SUMMARY.md` (what changed)

---

**Status**: ✅ Fully Implemented & Ready to Test

