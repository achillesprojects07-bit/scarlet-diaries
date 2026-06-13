# The Scarlet Diaries — V2.6.7

**Build name:** Visual Meal Builder Foundation
**Base preserved from:** V2.6.2 Include-All Header Build  
**Tagline:** Every drop. Every page. Unstoppable.

---

## What is this

The Scarlet Diaries is a Type 1 Diabetes support PWA built for a 9-year-old named Amara.

It is **not a medical device**. All insulin numbers are suggested estimates only and require adult confirmation before injection.

**Tech stack:** Static PWA · Firebase Auth · Firestore · GitHub Pages or any static host

---

## V2.6.3 Changelog

### New — Gentle Opening Check-in

V2.6.3 adds a soft once-per-day opening check-in for **Amara only**.

After Amara logs in, before she reaches the home screen, the app checks whether she has already completed today's check-in.

- If she has not checked in today, the check-in appears.
- If she has already checked in today, the app goes straight to Home.
- Adult users skip this check-in completely.

The check-in includes:

- rotating opening questions
- mood choices
- mood-matched encouragement
- rotating gentle next-step suggestions
- optional custom feeling text
- automatic return to Home after the response screen
- buttons for **Write a Scarlet Entry** and **Go home**

Mood choices:

- Brave
- Okay
- Tired
- Sad
- Angry
- Something only I can name

### Important emotional language rule

The new check-in feature intentionally does **not** use these words or phrases:

- page
- page
- page
- take a page
- deep page

The check-in copy also avoids telling Amara to calm down, hurry past the feeling, or fix the feeling.

The emotional principle is:

**Feelings are signals. They are valid exactly as they are.**

---

## Check-in data behavior

When the daily check-in is completed, it saves to:

`families/{familyId}/children/{childId}/moodLogs`

with:

- `source: "daily-checkin"`
- selected mood
- optional custom mood text
- `dateKey`
- question shown
- response shown
- next step shown
- created timestamp
- enteredBy user id

If custom text is entered, it also saves a Scarlet Entry with:

- `source: "daily-checkin"`

If Firebase is unavailable and the app is in Local Demo Mode, the check-in uses local storage so the demo can still continue.

---

## Badge behavior added in V2.6.3

The daily check-in can unlock:

- `steady-spark` — every completed check-in
- `girl-who-stayed` — sad, angry, or tired
- `soft-monster-tamer` — sad or angry
- `moonlit-heart` — sad
- `brave-page` — custom feeling text saved
- `truth-teller` — sad, angry, or tired

---

## Adult Dashboard update

The **Amara's Courage** section now includes:

- total daily check-ins
- latest check-in mood
- latest check-in date

---

## Preserved from V2.6.2

This build preserves the V2.6.2 base and does not rebuild the app from scratch.

Preserved features include:

- PIN login
- demo PIN `1111`
- Firebase role login behind the scenes
- Local Demo Mode fallback if Firebase blocks login
- Demo Mode / Live Mode
- private Live PIN setup before Go Live
- Reset Demo Data
- custom Scarlet Diaries vampire-inspired header image
- branded app top bars
- 300-food local database
- Breakfast Favorites
- Meal Favorites
- All food category
- food search by first letter or word
- measurable food portions
- Before I Eat full flow
- big Suggested Apidra card
- Adult Confirmed meal and insulin save
- High Sugar guided flow
- Low Sugar guided flow
- recent Apidra / insulin stacking protection
- Reports
- Adult Dashboard
- Adult-only Medical Settings
- editable ICR by adult only
- Scarlet Entry
- My Scarlet Pages
- Scarlet Vault
- badges
- Call My Circle
- alerts and acknowledgement

---

## Previous build history

### V2.5 — Motivation + Parent Dashboard + Medical Settings + Demo/Live Mode

Major features:

- editable Medical Settings for adults only
- ICR editable by Mom, Dad, and Tita
- low, high, and urgent-high thresholds editable
- insulin stacking window editable
- correction rules editable
- Demo Mode / Live Mode switch
- redesigned Adult Dashboard
- rebuilt Scarlet Vault
- rebuilt Reports
- preserved V2.4 food and safety flows

### V2.6 — PIN Login + Live PIN Setup

- replaced visible email/password login with profile + PIN login
- demo PIN `1111` for Amara, Mom, Dad, and Tita
- Firebase Auth still used behind the scenes
- adult must set private PINs before Go Live
- demo PIN stops working once Live Mode is active

### V2.6.1 — Login Hotfix

- if Firebase Auth or Firestore setup is not ready, demo PIN `1111` opens the app in Local Demo Mode instead of blocking login
- Local Demo Mode is for visual/testing access only

### V2.6.2 — Header Integration

- added the Vampire Diaries-inspired Scarlet Diaries header image
- login screen uses the custom Scarlet Diaries logo header
- app top bars use the branded header mark instead of plain SD badge

### V2.6.3 — Gentle Opening Check-in

- added once-per-day child-only emotional check-in
- added rotating question, response, and next-step arrays
- saved check-ins to mood logs
- connected emotional check-in to badges
- updated Adult Dashboard courage summary

---

## File structure

```text
/
├── index.html
├── app.js
├── styles.css
├── foods.json
├── firebase-config.js
├── firestore.rules
├── firebase.json
├── manifest.webmanifest
├── icons/
├── assets/
│   └── scarlet-diaries-header.png
└── functions/
```

---

## Setup

### 1. Firebase project

Create a Firebase project at Firebase Console.

Enable:

- Authentication → Email/Password
- Firestore

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

```bash
firebase deploy --only firestore:rules
```

### 4. Host on GitHub Pages

- Push all files to your GitHub repo.
- Enable GitHub Pages from Settings → Pages.
- Source: main branch / root.

---

## Login notes

### Demo Mode

Use PIN:

```text
1111
```

for:

- Amara
- Mom
- Dad
- Tita

### Live Mode

Before going live, an adult must set private PINs for each profile.

Once Live Mode is active, demo PIN `1111` stops working.

---

## Medical settings

Default ICR:

```text
1 unit Apidra per 8g carbs
```

Default thresholds:

```text
Low 70 · High 180 · Urgent High 300
```

Adults can update these from:

```text
Adult Dashboard → Medical Settings
```

These are suggested estimates only. Always confirm with Amara's doctor or diabetes care team.

---

## Safety disclaimer

This app is a demo. It is not a medical device. It does not provide medical advice.

All insulin suggestions are estimates from a saved family plan. Adult confirmation is required before any insulin injection.

Always follow the guidance of Amara's doctor and diabetes care team.

---

## Final checks for V2.6.3

- JavaScript syntax check passed.
- Build string is `V2.6.5`.
- V2.6.2 features were preserved.
- The new daily check-in feature contains no banned page/page/page wording.


---

## V2.6.4 — Check-in Behavior Fix

This version fixes the daily opening check-in behavior based on testing.

Changed behavior:

- The check-in now appears again after a fresh browser/app reopen.
- It no longer disappears for the rest of the day after one answer.
- It still appears only once during the active app session, so Amara is not interrupted every time she returns Home inside the same open session.
- The response/suggestion screen no longer auto-disappears after 3 seconds.
- Amara now chooses when to continue by tapping:

`I’m ready to begin`

The **Write a Scarlet Entry** button remains available on the response screen.


---

## V2.6.5 — Softer Amara Home + Lantus Shortcut Fix

This version makes Amara's side gentler and less overwhelming.

Changed:

- Lightened the child-facing background from near-black to a softer plum/burgundy diary palette.
- Simplified Amara's Home into three sections:
  - Safety first
  - How are you feeling?
  - Diary & courage
- Reduced the first-screen overwhelm by grouping choices instead of showing one large control-panel grid.
- Renamed `I Took Insulin` to `I Took Lantus`.
- The Home shortcut now logs Lantus basal insulin only.
- Apidra remains inside the meal/correction safety flows, not the Lantus shortcut.
- Preserved V2.6.4 check-in behavior.


---

## V2.6.6 — Pink Background Refinement

Changed the child-facing app background from soft plum/burgundy to a warmer pink diary palette while keeping Scarlet Diaries contrast, scarlet accents, and readable cards.


---

## V2.6.7 — Visual Meal Builder Foundation

Preserved V2.6.6 Pink Background as the base.

Added the first safe foundation of the visual meal builder:

- visual dish builder entry inside Before I Eat
- starter visual builders for Rice, Sinigang, Tinola, Adobo, McDonald's Burger, Nuggets, Fries, Greek Yogurt, and Drinks
- bowl, plate, stack, pour, and count builder types
- SVG-only food visuals, no external image dependencies
- tap-to-add component chips with carb and body-reference guides
- hidden-carb discovery cards for foods such as gabi, sayote, papaya, fries, sauces, and sweet drinks
- unified plate view with vegetable, carb, and protein zones
- gentle balance observations that never block Continue
- Continue always leads to hidden-carb check and existing Suggested Apidra estimate
- Adult Confirmed still auto-saves meal and Apidra
- mealLogs now include `plateData` when the visual builder is used
- added five Food Confidence badges: The Plate Builder, Veggie Champion, Protein Protector, The Balance Keeper, and Carb Aware
- kept classic food search as a fallback button
- removed confusing food entries from foods.json: kare-kare, dinuguan, nilaga, pochero, caldereta, mechado, menudo, paksiw, lugaw, goto, champorado, palabok, lechon kawali, and bulalo

Important language update:

- The app tagline was changed to **Every drop. Every page. Unstoppable.**
- The new meal builder does not use the banned page/pagee/pageing wording.
