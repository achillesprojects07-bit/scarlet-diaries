# 🩸 The Scarlet Diaries

**Current version: V5.0** — if the app or this page mentions any other version number, that part is outdated.

*Every drop. Every breath. Unstoppable.*

A private family app that helps Amara manage Type 1 diabetes with courage —
glucose checks, meal carb counting, insulin estimates (always adult-confirmed),
safety alerts to her Circle (Mom, Dad, and Tita), a feelings diary, and a badge
vault that celebrates effort, not perfect numbers.

**Live app:** https://achillesprojects07-bit.github.io/scarlet-diaries/

---

## How to know which version is running

Open the app — the version is printed on the splash screen and in the top bar
(for example, `V5.0`). If the live site shows an older version than this README:

1. Wait 1–2 minutes after uploading (GitHub Pages takes a moment to rebuild).
2. Refresh the page **twice**, or close the app fully and reopen it. Since
   V5.0 the app stores a copy of itself for offline use, so the first refresh
   fetches the update and the second one shows it.
3. Still old? Check that `index.html` and `app.js` in this repository were
   actually replaced (open them on GitHub and look for the version number near
   the top).

---

## What's in this repository

| File | What it does |
|---|---|
| `index.html` | The app's front door |
| `app.js` | All the app logic |
| `styles.css` | The look and feel |
| `foods.json` | 300-item Filipino & Greek food library with carb counts |
| `sw.js` | Offline support (the app works without signal and syncs later) |
| `manifest.webmanifest` | Lets the app install to a phone's home screen |
| `icons/` | App icons |
| `firebase-config.js` | Connects the app to the family's Firebase database — **never delete or overwrite this** |
| `firestore.rules` | Database security rules — these do nothing here; they must be pasted into the Firebase Console to take effect |
| `SETUP.md` | Step-by-step Firebase setup for alerts, security, and email |

---

## How to update the app

1. On GitHub: **Add file → Upload files**.
2. Drag in the new files (everything except `firebase-config.js`).
3. Commit, wait 1–2 minutes, refresh the live site twice.

## After updating — one-time Firebase steps

See `SETUP.md` for the full walkthrough. In short:

1. **Security:** enable Anonymous sign-in in Firebase Authentication **first**,
   then publish `firestore.rules` in Firestore → Rules.
2. **Real alert emails:** install the free "Trigger Email" extension in Firebase.
3. **Passcodes:** this repository is public, so everyone should change their
   personal code inside the app after deploying.

---

## Version history

| Version | Highlights |
|---|---|
| **V5.0** *(current)* | Severe-low emergency screen with auto-alert · insulin-stacking check in the meal flow · maximum single-dose safety cap · real alert emails (via SETUP.md) · doctor CSV export (14/30/90 days) · offline support + home-screen install · database security rules · accessibility fixes |
| V4.1 | Passcode login, meal flows, food library, badges, diary, adult dashboard |
| Earlier (V2.x–V3.x) | Prototypes — no longer in use |

---

## A note on safety

This app **supports — but never replaces** — the dosing plan from Amara's
endocrinologist. Every insulin estimate requires adult confirmation, and the
medical settings should always match the doctor's written plan.

Built with love for Amara, by her Circle. 🌙⚡🔮
