# The Scarlet Diaries — V1.4

**Phase 1 + Phase 2 Build**

This build combines the working foundation with the first safety layer.

## Phase 1 included

- Firebase web app connection
- Firebase Authentication login
- Child view for Amara
- Adult dashboard for Mom / Dad / Tita
- Firestore data saving
- Starter settings
- Starter food list
- Meal Mode
- Carb ratio: 1 unit per 8g carbs
- Dose rounding: nearest 1 unit
- Pre-meal glucose required
- Scarlet Entry
- Scarlet Vault
- Small visible build text: V1.4

## Phase 2 included

- High Sugar Mode
- Low Sugar Mode
- Ketone prompt at high glucose
- No strips option
- Moderate / large ketone emergency screen
- “I am alone” alert record
- “I already injected” alert record
- Insulin log
- Apidra correction alert record
- Insulin stacking warning question
- Symptoms check
- Emergency symptom alert record
- Parent dashboard alert feed
- Stronger safety wording
- Large iPhone / Pro Max UI tuning

## Important

Alert records are saved in Firestore and shown in the adult dashboard. Actual email sending requires the next backend notification step using Cloud Functions or another provider.

The app is a family safety assistant. It is not a medical prescription.
