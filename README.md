# The Scarlet Diaries

**Every drop. Every breath. Unstoppable.**

A private family diabetes safety, carb-counting, insulin logging, caregiver alert, and empowerment diary app for Amara.

## What is included in this GitHub package

- `index.html` — app shell
- `styles.css` — mobile-first Scarlet Diaries design
- `app.js` — Firebase app logic
- `firebase-config.example.js` — paste your Firebase web config here and rename to `firebase-config.js`
- `manifest.webmanifest` — iPhone/Android home screen app manifest
- `icons/` — simple SVG app icons
- `firestore.rules` — starter Firestore security rules
- `functions/index.js` — optional future Cloud Function placeholder for email alerts

## Important safety note

This app is a family safety assistant and diary. It is not a medical prescription. Insulin settings must be reviewed by an adult and ideally by a diabetes-trained clinician.

The app must never be treated as a command to inject. It shows an estimate based on saved family settings.

## Firebase setup

1. Open Firebase Console.
2. Create or open your project.
3. Go to **Project settings**.
4. Add a **Web App**.
5. Copy the Firebase config.
6. In this repo, duplicate:
   `firebase-config.example.js`
7. Rename the duplicate to:
   `firebase-config.js`
8. Paste your Firebase config inside it.

## Firebase Authentication

Enable:

- Email/Password sign-in

Then create accounts from the app or in Firebase Console.

Use role selection on login:

- Amara = child
- Mom/Dad/Aileen = adult

## Firestore Database

Create Firestore Database.

Start in production mode, then publish the included `firestore.rules`.

The app creates starter settings, starter foods, and starter badges after first login.

## Email alerts

In this first GitHub build, alerts are saved in Firestore and visible in the parent dashboard.

True email sending needs a server-side function. A placeholder is included in:

`functions/index.js`

Use SendGrid, Mailgun, or Nodemailer later.

## GitHub Pages deployment

1. Upload all files to your GitHub repository.
2. Make sure `firebase-config.js` exists in the root.
3. Go to repository **Settings → Pages**.
4. Choose branch `main` and root folder.
5. Open the GitHub Pages link.
6. On iPhone, open in Safari → Share → Add to Home Screen.

## Phase 1 features included

- Login with Firebase Authentication
- Role selection: child or adult
- Amara child home screen
- Meal Mode
- Pre-meal glucose required
- Carb ratio 1:8
- Dose rounding nearest 1 unit
- Pre-meal correction rules:
  - >180 add 2 units
  - >250 add 4 units
- Secret carbs checklist
- Filipino/Greek starter foods
- Meal logs saved to Firestore
- High Sugar Mode
- Low Sugar Mode
- Ketone prompt
- Insulin log
- Symptom log
- Write a Scarlet Entry
- The Scarlet Vault badges
- Parent dashboard
- Alert records in Firestore

## Files to edit first

Only edit this:

`firebase-config.js`

Later, edit emails in Firestore settings:

`families/scarlet-family/children/amara/settings/current`
