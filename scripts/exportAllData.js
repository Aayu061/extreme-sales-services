// scripts/exportAllData.js
// Exports all Firestore collections to a JSON file before migration or deletion.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const collections = [
    'users',
    'products',
    'amc_plans',
    'customer_amc',
    'service_requests',
    'enquiries',
    'feedback'
];

async function exportAllData() {
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
            console.error("❌ No Firebase credentials found. Provide FIREBASE_SERVICE_ACCOUNT env var or firebase-credentials.json in root.");
            process.exit(1);
        }
    }

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();
    const backupData = {};
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');
    const backupFile = path.join(backupDir, `firestore-full-backup-${dateStr}.json`);

    console.log("🚀 Starting complete Firestore export...");

    for (const colName of collections) {
        console.log(`📥 Exporting collection: ${colName}...`);
        try {
            const snap = await db.collection(colName).get();
            backupData[colName] = snap.docs.map(doc => ({
                _id: doc.id,
                ...doc.data()
            }));
            console.log(`   ✅ Exported ${backupData[colName].length} documents from ${colName}`);
        } catch (err) {
            console.warn(`   ⚠️ Warning: Could not export ${colName}:`, err.message);
            backupData[colName] = [];
        }
    }

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`\n🎉 Full backup completed successfully!`);
    console.log(`📁 File saved to: ${backupFile}`);
}

exportAllData().catch(err => {
    console.error("Export failed:", err);
    process.exit(1);
});
