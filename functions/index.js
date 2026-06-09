const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

/**
 * Phase 6 email alert sender.
 *
 * Before deploy, configure SMTP secrets:
 * firebase functions:config:set scarlet.smtp_host="smtp.gmail.com" scarlet.smtp_port="465" scarlet.smtp_user="YOUR_EMAIL" scarlet.smtp_pass="YOUR_APP_PASSWORD" scarlet.from_email="YOUR_EMAIL"
 *
 * Then deploy:
 * firebase deploy --only functions
 *
 * Alerts are created by the frontend at:
 * families/{familyId}/alerts/{alertId}
 */
exports.onScarletAlertCreated = functions.firestore
  .document("families/{familyId}/alerts/{alertId}")
  .onCreate(async (snap, context) => {
    const alert = snap.data();
    const familyId = context.params.familyId;
    const alertId = context.params.alertId;

    const cfg = functions.config().scarlet || {};
    const recipients = Array.isArray(alert.recipients) ? alert.recipients.filter(Boolean) : [];

    if (!recipients.length) {
      await snap.ref.update({
        emailStatus: "no_recipients",
        emailCheckedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return null;
    }

    if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass || !cfg.from_email) {
      await snap.ref.update({
        emailStatus: "smtp_not_configured",
        emailCheckedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log("SMTP not configured. Alert stored only.", { familyId, alertId, alert });
      return null;
    }

    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: Number(cfg.smtp_port || 465),
      secure: String(cfg.smtp_port || "465") === "465",
      auth: {
        user: cfg.smtp_user,
        pass: cfg.smtp_pass
      }
    });

    const severity = String(alert.severity || "alert").toUpperCase();
    const subject = `Scarlet Alert: ${severity} for Amara`;

    const text = [
      `The Scarlet Diaries alert`,
      ``,
      `Severity: ${severity}`,
      `Type: ${alert.type || "alert"}`,
      `Message: ${alert.message || ""}`,
      ``,
      `Please check Amara and acknowledge in the app.`,
      ``,
      `This is an automated family safety alert, not medical advice.`
    ].join("\n");

    try {
      await transporter.sendMail({
        from: cfg.from_email,
        to: recipients.join(","),
        subject,
        text
      });

      await snap.ref.update({
        emailStatus: "sent",
        emailSentAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Email send failed", err);
      await snap.ref.update({
        emailStatus: "send_failed",
        emailError: String(err.message || err),
        emailCheckedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return null;
  });
