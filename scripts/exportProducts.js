// backups/exportProducts.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function exportProducts() {
  const dateStr = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `products-pre-migration-${dateStr}.json`);

  let products = [];

  // Try direct Firebase Admin SDK if credentials are present
  try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      serviceAccount = require('../firebase-credentials.json');
    }
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    const db = admin.firestore();
    const snap = await db.collection('products').orderBy('created_at', 'desc').get();
    products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    // Fallback: Query live API endpoint
    const apiUrl = (process.env.APP_URL || 'http://localhost:5000') + '/api/products';
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.success) {
      products = data.products;
    } else {
      throw new Error('Could not fetch products');
    }
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.writeFileSync(backupFile, JSON.stringify(products, null, 2), 'utf8');
  console.log(`✅ Backup successfully created at: ${backupFile}`);
  console.log(`📦 Total products backed up: ${products.length}`);
}

exportProducts().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
