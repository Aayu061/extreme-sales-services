// scripts/migrateProducts.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Target schema products prepared in server/data/products.js
const updatedProducts = require('../server/data/products.js');

async function migrateFirestore() {
  console.log("Starting migration of Firestore 'products' collection...");

  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    try {
      serviceAccount = require('../firebase-credentials.json');
    } catch (e) {
      console.warn("⚠️ Local firebase-credentials.json not found.");
      console.log("To run direct Firestore migration, ensure firebase-credentials.json is placed in project root or FIREBASE_SERVICE_ACCOUNT env var is set.");
      return;
    }
  }

  const admin = require('firebase-admin');
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();
  const batch = db.batch();

  for (const item of updatedProducts) {
    const docRef = db.collection('products').doc(item.id);

    // Schema updates:
    // category, type, brand, model, starRating, capacityTon, features, specs
    // For products where price is 0 (VRF/Chiller/AHU), set priceOnRequest: true
    const updateData = {
      category: item.category,
      type: item.type,
      brand: item.brand,
      model: item.model,
      name: item.name,
      starRating: item.starRating,
      capacityTon: item.capacityTon,
      features: item.features,
      specs: item.specs,
      in_stock: item.inStock,
      images: item.images,
      image_url: item.images[0] || ''
    };

    if (item.price === 0) {
      updateData.priceOnRequest = true;
      updateData.price = 0;
    } else {
      updateData.priceOnRequest = false;
      updateData.price = Number(item.price);
    }

    batch.set(docRef, updateData, { merge: true });
    console.log(`Queued update for [${item.id}]: ${item.name}`);
  }

  await batch.commit();
  console.log(`✅ Successfully updated ${updatedProducts.length} documents in Firestore!`);
}

if (require.main === module) {
  migrateFirestore().catch(console.error);
}

module.exports = { migrateFirestore };
