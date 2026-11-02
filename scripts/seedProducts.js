// scripts/seedProducts.js
require('dotenv').config();
const admin = require('firebase-admin');
const products = require('../server/data/products.js');

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
    console.warn("Local firebase-credentials.json not found:", err.message);
    process.exit(1);
  }
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function seedProducts() {
  try {
    console.log("Seeding 15 Verified Air Conditioners into Firestore 'products' collection...");
    const existingSnap = await db.collection('products').get();
    
    const batch = db.batch();
    
    // Clear any existing products to maintain a pure, verified catalog
    if (!existingSnap.empty) {
      console.log(`Clearing ${existingSnap.size} outdated product records...`);
      existingSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // Add each of the 15 ACs
    products.forEach(p => {
      const docRef = db.collection('products').doc(p.id);
      batch.set(docRef, p);
    });

    await batch.commit();
    console.log(`✅ Successfully seeded ${products.length} Air Conditioners across 5 top brands (Daikin, Voltas, LG, Blue Star, Panasonic)!`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding products:", error);
    process.exit(1);
  }
}

seedProducts();
