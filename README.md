# The Scarlet Diaries — V2.0 Profile Repair Hotfix

This build fixes the case where an email already exists in Firebase Authentication but has no matching Firestore user profile.

## What it fixes

- Existing Auth user + missing `/users/{uid}` profile.
- Login race condition where Firebase Auth state could sign the user out before profile validation finished.
- Adds a **Profile Repair Needed** screen.
- The repair screen shows:
  - email
  - selected role
  - Create Scarlet Profile button
- After repair, the user enters the app normally.
- Keeps strict role validation once a profile exists.
- Shows V2.0 in the app.

## Important

Publish the included `firestore.rules` again after uploading this build.

Firebase Console → Firestore Database → Rules → paste full `firestore.rules` → Publish.

## How to use repair

1. Choose the correct role.
2. Enter the existing email/password.
3. Tap Unlock the Diary.
4. If the profile is missing, tap **Create Scarlet Profile**.
5. Next time, use Unlock the Diary normally.
