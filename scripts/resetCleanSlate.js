// scripts/resetCleanSlate.js
// Purges all demo products, demo tickets, demo staff, demo technicians, demo admin,
// demo customer AMCs, demo enquiries, and demo feedback.
// Leaves ONLY the authoritative original Super Admin account.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", e.message);
        process.exit(1);
    }
} else {
    const credPath = path.join(__dirname, '..', 'firebase-credentials.json');
    if (fs.existsSync(credPath)) {
        serviceAccount = require(credPath);
    } else {
        console.error("❌ No Firebase credentials found in root.");
        process.exit(1);
    }
}

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize = 100) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });

    async function deleteQueryBatch(query, resolve, reject) {
        try {
            const snapshot = await query.get();
            const batchSize = snapshot.size;
            if (batchSize === 0) {
                resolve();
                return;
            }

            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            process.nextTick(() => {
                deleteQueryBatch(query, resolve, reject);
            });
        } catch (err) {
            reject(err);
        }
    }
}

async function runCleanSlate() {
    console.log("🧹 Starting Clean Slate Reset for College Presentation...");

    // 1. Purge demo collections
    const collectionsToPurge = [
        'products',
        'service_requests',
        'enquiries',
        'feedback',
        'customer_amc'
    ];

    for (const col of collectionsToPurge) {
        console.log(`🗑️  Purging collection: ${col}...`);
        await deleteCollection(col);
        console.log(`   ✅ Collection ${col} is now completely empty.`);
    }

    // 2. Clean users collection: Delete all users
    console.log("👥 Resetting users collection...");
    const usersSnap = await db.collection('users').get();
    const userBatch = db.batch();
    usersSnap.forEach((doc) => {
        userBatch.delete(doc.ref);
    });
    await userBatch.commit();
    console.log("   ✅ All past/demo user accounts purged.");

    // 3. Seed ONLY the Authoritative Original Super Admin
    const TARGET_EMAIL = process.env.ADMIN_SEED_EMAIL || "ess0121@gmail.com";
    const TARGET_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "@22062006@";
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(TARGET_PASSWORD, salt);

    const adminDocRef = db.collection('users').doc('usr-super-admin');
    await adminDocRef.set({
        name: "Super Admin",
        email: TARGET_EMAIL,
        phone: "7977805245",
        role: "admin",
        password_hash: password_hash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    console.log("════════════════════════════════════════════════════════");
    console.log("✅ CLEAN SLATE RESET COMPLETE!");
    console.log("────────────────────────────────────────────────────────");
    console.log("👑 AUTHORITATIVE ORIGINAL ADMIN CREDENTIALS:");
    console.log(`   Email    : ${TARGET_EMAIL}`);
    console.log(`   Password : ${TARGET_PASSWORD}`);
    console.log(`   Role     : admin`);
    console.log(`   Name     : Super Admin`);
    console.log(`   Phone    : 7977805245`);
    console.log("────────────────────────────────────────────────────────");
    console.log("📦 Products: 0 (Empty catalog)");
    console.log("📋 Service Requests: 0 (Empty queue)");
    console.log("💬 Enquiries: 0");
    console.log("⭐ Feedback: 0");
    console.log("🧑‍🔧 Staff & Technicians: 0 (Create fresh staff/tech in Admin Portal)");
    console.log("════════════════════════════════════════════════════════");
}

runCleanSlate().then(() => process.exit(0)).catch(err => {
    console.error("❌ Reset failed:", err);
    process.exit(1);
});

