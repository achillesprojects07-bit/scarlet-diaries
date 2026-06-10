# The Scarlet Diaries — V5.0 Setup Guide

V5.0 is a drop-in replacement for V4.1. Copy all the files into your hosting
folder (keep your existing `firebase-config.js` — it is not included here) and
deploy as usual. The app works immediately, but two short Firebase Console
steps unlock the new safety features. Do them in this order.

---

## Step 1 — Turn on Anonymous Authentication + publish the new rules (10 min)

This locks your database so it can no longer be read or written by anyone on
the internet who finds your Firebase config.

1. Open the [Firebase Console](https://console.firebase.google.com) → your project.
2. Go to **Build → Authentication → Sign-in method**.
3. Click **Anonymous** → toggle **Enable** → Save.
4. Go to **Build → Firestore Database → Rules** tab.
5. Delete what is there, paste the entire contents of `firestore.rules`
   (included in this folder), and click **Publish**.
6. Open the app and log in once as each role to confirm everything still works.

> ⚠️ Do Step 1.3 (enable Anonymous) BEFORE Step 1.5 (publish rules).
> If you publish the rules first, the app will be locked out until
> anonymous sign-in is enabled.

## Step 2 — Make alert emails real (15 min, free tier available)

Every "Alert Mom / Dad / Tita" button now queues a real email. To make them
actually send:

1. Firebase Console → **Build → Extensions** (or Extensions Hub) →
   search **"Trigger Email from Firestore"** (official Firebase extension).
2. Click **Install** and configure:
   - **Email documents collection:** `mail`
   - **SMTP connection URI:** use a free SMTP service. Easiest options:
     - Gmail: `smtps://YOUR_GMAIL_ADDRESS:APP_PASSWORD@smtp.gmail.com:465`
       (create an App Password at myaccount.google.com → Security →
       2-Step Verification → App passwords)
     - Or Brevo/SendGrid free tiers if you prefer not to use Gmail.
   - **Default FROM address:** the same address.
3. After install, press any Alert button in the app — the email should arrive
   within a minute.
4. Update the real recipient addresses: the app sends to the addresses stored
   in settings (`alertEmails`). Replace the placeholder `@example.com`
   addresses — either edit them in Firestore Console under
   `families/scarlet-family/children/amara/settings/current`, or ask your
   developer to add an editable field (5-line change).

> The extension requires the Blaze (pay-as-you-go) plan, but email volume at
> family scale stays within the free allowance — effectively ₱0/month.

## Step 3 — Change the default passcodes (2 min)

The factory passcodes are written in the app's source code, so treat them
like a luggage lock that shipped with "0000". After first login, each person
should change their code: **Login → enter the app → Exit → log in → use the
Change Code option**, or simply ask each family member to do it from
Settings. Pick codes that are not names + birthdays.

---

## What's new in V5.0

**Safety**
- Severe-low emergency screen: any reading below 54 mg/dL auto-alerts the
  whole Circle and shows step-by-step emergency guidance (fast sugar,
  stay with an adult, glucagon/emergency help if she can't swallow).
- Insulin-stacking check in the meal flow: if sugar is above target, the app
  asks whether Apidra was taken in the last 3 hours; if yes (or unsure), the
  auto-correction is skipped and clearly labeled, leaving the call to an adult.
- Maximum single dose safety cap (default 15 units, adjustable in Medical
  Settings): doses above the cap can't be confirmed — catches carb typos.
- Doctor-plan disclaimer on the dose screen and in Medical Settings.

**Alerts**
- Alerts are queued as real emails (Step 2 makes them send).
- Honest status copy on the adult dashboard until email is live.

**For checkups**
- "Export for the Doctor": one-tap CSV of the last 14/30/90 days of glucose,
  insulin, meals, and ketone checks — open it in Excel/Sheets or print it.

**Offline**
- Full offline support: the app now installs to the home screen (PWA), loads
  without signal, and logs save locally and sync when connection returns —
  for school, restaurants, and the Manila ↔ La Union drive.

**Under the hood**
- Firebase Auth handshake + locked-down security rules (Step 1).
- Hardened session restore (forged localStorage values no longer log in).
- Live dashboard listeners are now cleaned up on logout (no more leaks).
- Passcode seeding runs once per session instead of on every login.
- Screen-reader improvements (announced toasts, labeled buttons, nav state).

---

## Going further (recommended, needs a developer for ~a day)

1. **Tier 2 security:** create email/password accounts for the four family
   members in Firebase Authentication, switch the rules to the `isFamily()`
   function included (commented) in `firestore.rules`, and add a one-time
   email sign-in screen. This makes the data readable by your family ONLY.
2. **Push notifications / SMS:** a small Cloud Function with Firebase Cloud
   Messaging (free) or Twilio SMS so red alerts buzz phones instantly instead
   of relying on email.
3. **Alert escalation:** re-notify everyone if a red alert isn't acknowledged
   within 10 minutes.

---

## File list

| File | What it is |
|---|---|
| `index.html` | App shell — now registers the service worker |
| `app.js` | Main app (V5.0, all fixes applied) |
| `styles.css` | Unchanged from V4.1 |
| `foods.json` | Unchanged — 300-item food library |
| `sw.js` | NEW — service worker (offline support) |
| `manifest.webmanifest` | NEW — home-screen install |
| `icons/` | NEW — app icons |
| `firestore.rules` | NEW — paste into Firebase Console (Step 1) |
| `firebase-config.js` | NOT included — keep your existing one |

*The Scarlet Diaries supports — but never replaces — the care plan from
Amara's endocrinologist.*
