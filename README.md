# The Scarlet Diaries — V2.5

**Motivation + Parent Dashboard + Medical Settings + Demo/Live Mode**

> Every drop. Every breath. Unstoppable.

---

## What is this

The Scarlet Diaries is a Type 1 Diabetes support PWA built for a 9-year-old named Amara. It is not a medical device. All insulin numbers are suggested estimates only and require adult confirmation before injection.

**Tech stack:** Static PWA · Firebase Auth · Firestore · GitHub Pages (or any static host)

---

## V2.5 Changelog

### New — Editable Medical Settings (adults only)
- ICR (insulin to carb ratio) is now editable by Mom, Dad, and Tita
- Low/high/urgent-high thresholds are editable
- Insulin stacking window is editable
- Correction rules are editable
- Amara cannot see or edit medical settings
- Settings save to Firestore and immediately update all calculation flows
- Warning copy: "Change these only if Amara's doctor or diabetes care team updates the plan"
- Fixed default high threshold from 250 to 180 (correct clinical default)

### New — Demo Mode / Live Mode switch (adults only)
- App mode saved to Firestore under `families/scarlet-family/settings/appMode`
- Mode pill visible in adult dashboard header (Demo / Live)
- Go Live confirmation dialog
- Return to Demo Mode confirmation dialog
- Reset Demo Data only available in Demo Mode
- Amara cannot see or change app mode

### New — Redesigned Adult Dashboard
- Top header: role name + mode pill + Exit button
- Section 1: Today's Safety Snapshot — live status card (Calm / Needs Review / Urgent) with color coding
- Section 2: Needs Adult Attention — live alerts list with severity pills and "I saw this" acknowledge buttons
- Section 3: Quick Actions — 4 buttons: Open Reports · Medical Settings · Scarlet Vault · App Mode
- Section 4: Recent Care Timeline — chronological timeline of glucose, meal, insulin, diary, and alert events
- Section 5: Amara's Courage — badge count, diary count, help requests, safety steps, latest badge earned
- Section 6: Pattern Review — total log counts, low/high event counts, button to Open Full Reports
- Section 7: Demo Tools — reset button only visible in Demo Mode, placed at the bottom
- No child-style emotional elements in adult view
- No duplicate Reports buttons
- No demo tools at the top

### Rebuilt — The Scarlet Vault
- Summary header: "X proofs of courage" + poetic tagline
- 5 organized sections: Safety · Food Confidence · Scarlet Pages · Streaks · Courage
- Each badge shows: name · poetic subtitle · full desc · when it wakes (if locked) · date unlocked (if available)
- Unlocked badges glow with scarlet border and icon
- Locked badges are dim but readable — not discouraging
- 27 badges total, each with unique subtitle and meaning
- Adult can view vault summary from Quick Actions

### Rebuilt — Reports
- Clear empty state: "No report data yet. Use the app for a few logs, then come back."
- Firestore permission error shows clear message
- 7-day and 14-day sections with per-type counts
- Reports do NOT appear after meal save, insulin save, low save, or high save
- Adult dashboard has one clear "Open Reports" button in Quick Actions and one in Pattern Review
- Reports Back button always works

### Preserved from V2.4 — all working features kept
- Firebase Auth, Firestore, role validation, profile repair
- 300-food foods.json (loads locally — no Firestore seeding needed)
- Breakfast Favorites, Meal Favorites, All category
- Food search by first letter and word
- Measurable portions
- Before I Eat full flow: glucose → food → Meal So Far → hidden carbs → Suggested Apidra card → Adult Confirmed → auto-save meal and insulin log
- High sugar flow: ketones → symptoms → recent Apidra → stacking warning → no correction if recent Apidra → Adult Confirmed
- Low sugar guided flow: fast sugar → adult alert → recheck → save (no dropdowns)
- Call My Circle, alerts, acknowledgement
- Scarlet Entry, My Scarlet Pages
- Demo Reset (type RESET to confirm)
- All button feedback (Saving… / Saved, Adding… / Added ✓, Sending alert…)

---

## File structure

```
/
├── index.html            ← Entry point
├── app.js                ← All app logic (V2.5)
├── styles.css            ← All styles (V2.5)
├── foods.json            ← 300-food local database
├── firebase-config.js    ← YOUR Firebase config (fill in your values)
├── firestore.rules       ← Firestore security rules
├── firebase.json         ← Firebase project config
├── manifest.webmanifest  ← PWA manifest
├── icons/                ← App icons
└── functions/            ← Firebase Functions (email alerts, future use)
```

---

## Setup

### 1. Firebase project
- Create a Firebase project at console.firebase.google.com
- Enable Authentication (Email/Password)
- Enable Firestore

### 2. firebase-config.js
Fill in your project values:
```js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Firestore rules
Deploy the included `firestore.rules` file:
```
firebase deploy --only firestore:rules
```

### 4. Host on GitHub Pages
- Push all files to your GitHub repo
- Enable GitHub Pages from Settings → Pages → Source: main branch / root
- App loads at `https://yourusername.github.io/your-repo-name`

---

## Accounts to create

On first use, create each account:
1. Open the app
2. Select the role (Amara, Mom, Dad, Tita)
3. Enter email and password
4. Click "Create account"

Suggested demo emails:
- amara@scarletdiaries.demo
- mom@scarletdiaries.demo
- dad@scarletdiaries.demo
- tita@scarletdiaries.demo

---

## Medical settings

Default ICR: **1 unit Apidra per 8g carbs**
Default thresholds: Low 70 · High 180 · Urgent High 300

Adults can update these from Adult Dashboard → Medical Settings.

These are suggested estimates only. Always confirm with Amara's doctor or diabetes care team.

---

## Safety disclaimer

This app is a demo. It is not a medical device. It does not provide medical advice. All insulin suggestions are estimates from a saved family plan. Adult confirmation is required before any insulin injection. Always follow the guidance of Amara's doctor and diabetes care team.

---

*The Scarlet Diaries V2.5 · Every drop. Every breath. Unstoppable.*


## V2.6 PIN Login + Live PIN Setup Hotfix

- Replaced visible email/password login with profile + PIN login.
- Demo Mode uses PIN `1111` for Amara, Mom, Dad, and Tita.
- The app still signs into a separate Firebase Auth account for each role behind the scenes so Firestore logs, alerts, reports, and dashboards keep working.
- Before switching to Live Mode, an adult must set private PINs for Amara, Mom, Dad, and Tita.
- Once Live Mode is active, demo PIN `1111` stops working.
- Adults can change Live PINs or return to Demo Mode from Adult Dashboard → App Mode.


## V2.6.1 Login Hotfix

If Firebase Auth or Firestore setup is not ready, demo PIN `1111` now opens the app in **Local Demo Mode** instead of blocking the demo at login.

For full Firebase sync, enable:
- Firebase Authentication → Sign-in method → Email/Password
- Publish the included Firestore rules

Local Demo Mode is only for visual/testing access. Live use should connect to Firebase.


## V2.6.2 Header Integration
- Added the Vampire Diaries-inspired Scarlet Diaries header image into the app.
- Login screen now uses the custom Scarlet Diaries logo header.
- App top bars now use the new branded header mark instead of the plain SD badge.
