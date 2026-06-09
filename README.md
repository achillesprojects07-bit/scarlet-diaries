# The Scarlet Diaries — V1.6

Phase 5 + Phase 6 build.

## Phase 5: The Scarlet Vault / Badges

- Expanded dramatic badge collection
- Stronger Scarlet Vault
- Wall of Proof count and affirmation
- More badges for Circle alerts, hidden carbs, ketones, family foods, emotional courage
- Better unlocked badge glow styling
- Badge unlocks tied to more real safety and diary actions

## Phase 6: Alerts + Notifications

- Alert records remain saved in Firebase
- Adult dashboard now shows alert status
- Adults can tap **I saw this**
- Alert acknowledgement is saved to Firestore
- Alerts now include `emailStatus`
- Firebase Functions folder added for email sending
- `firebase.json` added for functions/rules deployment
- Email sender template included using Nodemailer SMTP

## Important

Actual email delivery will only work after Firebase Functions is deployed and SMTP is configured.

The app is a family safety assistant, not medical advice.
