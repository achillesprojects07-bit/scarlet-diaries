# The Scarlet Diaries Firebase Functions

This folder is for Phase 6 email alerts.

The frontend already creates alert records in Firestore. This function listens for new alert records and sends email if SMTP is configured.

## Setup

Install Firebase CLI, then from project root:

```bash
firebase init functions
```

Copy this `functions` folder into your Firebase project.

Configure SMTP secrets:

```bash
firebase functions:config:set scarlet.smtp_host="smtp.gmail.com" scarlet.smtp_port="465" scarlet.smtp_user="YOUR_EMAIL" scarlet.smtp_pass="YOUR_APP_PASSWORD" scarlet.from_email="YOUR_EMAIL"
```

Deploy:

```bash
firebase deploy --only functions
```

For Gmail, use an App Password, not the normal Gmail password.
