/**
 * Optional Phase 1 email alert sender.
 *
 * This is NOT required for the frontend to run.
 * Use only if you upgrade the Firebase project to use Cloud Functions.
 *
 * Setup:
 * 1. Install Firebase CLI.
 * 2. Run firebase init functions.
 * 3. Replace functions/index.js with this file.
 * 4. Configure an email provider. Firebase Functions cannot send email by itself.
 *
 * Recommended easiest provider later: SendGrid, Mailgun, or Gmail SMTP through Nodemailer.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.onScarletAlertCreated = functions.firestore
  .document("families/{familyId}/alerts/{alertId}")
  .onCreate(async (snap, context) => {
    const alert = snap.data();
    console.log("Scarlet alert created:", alert);

    // TODO: Connect SendGrid/Mailgun/Nodemailer here.
    // For now, alerts are stored in Firestore and visible in Parent Dashboard.
    return null;
  });
