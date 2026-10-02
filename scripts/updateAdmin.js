// scripts/updateAdmin.js
// Seeds or updates the primary Admin credentials in Firestore.
// Email: ESS0121@gmail.com (normalized to ess0121@gmail.com)
// Password: @22062006@

require('dotenv').config();
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", err);
    process.exit(1);
  }
} else {
  try {
    serviceAccount = require('../firebase-credentials.json');
  } catch (err) {
    console.error("Firebase credentials file not found. Place firebase-credentials.json in project root.");
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function setAdminCredentials() {
    const TARGET_EMAIL = "ess0121@gmail.com";
    const TARGET_PASSWORD = "@22062006@";

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(TARGET_PASSWORD, salt);

    console.log(`🔍 Checking for existing admin user in Firestore...`);

    // Check by target email first
    let snap = await db.collection('users').where('email', '==', TARGET_EMAIL).get();

    // If not found, check other known past admin emails
    if (snap.empty) {
        snap = await db.collection('users').where('email', '==', 'extremess0121@gmail.com').get();
    }
    if (snap.empty) {
        snap = await db.collection('users').where('email', '==', 'admin@extremess.com').get();
    }
    if (snap.empty) {
        snap = await db.collection('users').where('role', '==', 'admin').get();
    }

    if (!snap.empty) {
        // Update existing record
        const docRef = snap.docs[0].ref;
        await docRef.set({
            name: "Super Admin",
            email: TARGET_EMAIL,
            role: "admin",
            password_hash: password_hash,
            updated_at: new Date().toISOString()
        }, { merge: true });

        console.log(`✅ Existing admin record (${snap.docs[0].id}) successfully updated!`);
    } else {
        // Create new record
        const newDoc = await db.collection('users').add({
            name: "Super Admin",
            email: TARGET_EMAIL,
            phone: "7977805245",
            role: "admin",
            password_hash: password_hash,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        console.log(`✅ New admin user created (${newDoc.id})!`);
    }

    console.log("────────────────────────────────────────────────");
    console.log(`📧 Admin Email    : ESS0121@gmail.com`);
    console.log(`🔑 Admin Password : @22062006@`);
    console.log(`🛡️  Role           : admin`);
    console.log("────────────────────────────────────────────────");
    process.exit(0);
}

setAdminCredentials().catch(err => {
    console.error("❌ Error updating admin:", err);
    process.exit(1);
});
