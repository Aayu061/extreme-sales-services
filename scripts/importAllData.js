// scripts/importAllData.js
// Imports previously exported Firestore data into the new Firebase project.
// Usage: node scripts/importAllData.js <path-to-backup-file.json>
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function importAllData() {
    const backupArg = process.argv[2];
    let backupPath = backupArg;

    if (!backupPath) {
        // Find latest backup in backups/ folder
        const backupDir = path.join(__dirname, '..', 'backups');
        if (fs.existsSync(backupDir)) {
            const files = fs.readdirSync(backupDir).filter(f => f.startsWith('firestore-full-backup-'));
            if (files.length > 0) {
                files.sort().reverse();
                backupPath = path.join(backupDir, files[0]);
                console.log(`ℹ️ Auto-selected latest backup: ${backupPath}`);
            }
        }
    }

    if (!backupPath || !fs.existsSync(backupPath)) {
        console.error("❌ Please provide a valid backup file path.");
        console.error("Usage: node scripts/importAllData.js backups/firestore-full-backup-XYZ.json");
        process.exit(1);
    }

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
    const rawData = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(rawData);

    console.log(`🚀 Starting import into new Firebase Firestore database...`);

    for (const [colName, docs] of Object.entries(backupData)) {
        if (!Array.isArray(docs) || docs.length === 0) continue;
        console.log(`📤 Importing ${docs.length} documents into collection: ${colName}...`);

        let batch = db.batch();
        let count = 0;

        for (const item of docs) {
            const { _id, ...docData } = item;
            const docRef = _id ? db.collection(colName).doc(_id) : db.collection(colName).doc();
            batch.set(docRef, docData, { merge: true });
            count++;

            // Firestore batch limit is 500
            if (count % 400 === 0) {
                await batch.commit();
                batch = db.batch();
            }
        }

        await batch.commit();
        console.log(`   ✅ Imported collection ${colName} successfully!`);
    }

    console.log(`\n🎉 Data restoration to new Firebase project complete!`);
}

importAllData().catch(err => {
    console.error("Import failed:", err);
    process.exit(1);
});
