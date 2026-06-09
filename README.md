# The Scarlet Diaries — V1.9 Firestore/Login Hotfix

This is a Firebase/Auth/Firestore hotfix.

## Fixes

- Corrected Firestore rules for first-time user profile creation.
- A signed-in user can now create/read only their own `/users/{uid}` profile.
- Role validation remains strict:
  - Amara email can only enter Amara
  - Mom email can only enter Mom
  - Dad email can only enter Dad
  - Tita email can only enter Tita
- Login no longer depends on family starter-data seeding succeeding.
- If starter food/badge setup is blocked, the app still opens using built-in starter foods.
- Better error message for permissions issue.
- Added note: “Already created? Use Unlock the Diary above.”
- V1.9 shown in the app.

## Very important setup step

After uploading this build to GitHub, you must also publish the included `firestore.rules` in Firebase Console:

Firebase Console → Firestore Database → Rules → paste `firestore.rules` → Publish

Without publishing the V1.9 rules, Create account and Unlock the Diary can still show:
“Missing or insufficient permissions.”

## Recommended account setup

Create one account per profile:

- Amara account, selected as Amara
- Mom account, selected as Mom
- Dad account, selected as Dad
- Tita account, selected as Tita

Do not use the same email for every role.
