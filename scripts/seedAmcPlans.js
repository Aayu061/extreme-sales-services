// backend/seedAmcPlans.js
require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:", err);
    process.exit(1);
  }
} else {
  try {
    serviceAccount = require('../firebase-credentials.json');
  } catch (err) {
    console.error("Firebase credentials file not found. Set FIREBASE_SERVICE_ACCOUNT environment variable or place firebase-credentials.json in Backend folder.", err);
    process.exit(1);
  }
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const amcPlans = [
  {
    code: "SAMC 1",
    name: "SAMC 1 - Comprehensive Split (Non-Inverter)",
    category: "samc",
    ac_type: "split",
    inverter: false,
    services_per_year: 4,
    unlimited_complaints: true,
    includes_parts: true,
    includes_gas: false,
    prices: {
      "0.8_1.0": 2999,
      "1.5_2.2": 3999
    },
    price: 2999,
    description: "4 Services, Unlimited Complaints Attend, Capacitor Replace, Motor Winding & PCB Repair",
    terms: "For SAMC AC's Must Have Under 3 Years from Purchase. GST Extra 28%.",
    created_at: new Date().toISOString()
  },
  {
    code: "SAMC 2",
    name: "SAMC 2 - Comprehensive Split with Gas Charging",
    category: "samc",
    ac_type: "split",
    services_per_year: 4,
    unlimited_complaints: true,
    includes_parts: true,
    includes_gas: true,
    popular: true,
    prices: {
      "0.8_1.0": 4499,
      "1.5_2.2": 5499
    },
    price: 4499,
    description: "4 Services, Unlimited Complaints Attend, Capacitor Replace, PCB Repair, Motor Winding & Gas Charging",
    terms: "For SAMC AC's Must Have Under 3 Years from Purchase. GST Extra 28%.",
    created_at: new Date().toISOString()
  },
  {
    code: "SAMC 3",
    name: "SAMC 3 - Comprehensive Window with Gas Charging",
    category: "samc",
    ac_type: "window",
    services_per_year: 4,
    unlimited_complaints: true,
    includes_parts: true,
    includes_gas: true,
    prices: {
      "0.8_1.0": 3499,
      "1.5_2.2": 4499
    },
    price: 3499,
    description: "4 Services, Unlimited Complaints Attend, Capacitor Replace, PCB Repair, Motor Winding & Gas Charging",
    terms: "For SAMC AC's Must Have Under 3 Years from Purchase. GST Extra 28%.",
    created_at: new Date().toISOString()
  },
  {
    code: "ORD 3",
    name: "Ordinary 3 Visits / 3 Services",
    category: "ordinary",
    ac_type: "all",
    services_per_year: 3,
    unlimited_complaints: false,
    includes_parts: false,
    includes_gas: false,
    prices: {
      "split": 1500,
      "window": 1000
    },
    price: 1500,
    description: "Ordinary 3 Scheduled Routine Services / Visits per year",
    terms: "All Rates are Basic GST Applicable as per requirement.",
    created_at: new Date().toISOString()
  },
  {
    code: "ORD 4",
    name: "Ordinary 4 Services & Unlimited Complaints",
    category: "ordinary",
    ac_type: "all",
    services_per_year: 4,
    unlimited_complaints: true,
    includes_parts: false,
    includes_gas: false,
    prices: {
      "split": 1800,
      "window": 1300
    },
    price: 1800,
    description: "Ordinary 4 Services & Unlimited Normal Complaints Attend (Window includes 1 Wet Service)",
    terms: "All Rates are Basic GST Applicable as per requirement.",
    created_at: new Date().toISOString()
  },
  {
    code: "ORD 6",
    name: "Ordinary 6 Services & Unlimited Complaints",
    category: "ordinary",
    ac_type: "all",
    services_per_year: 6,
    unlimited_complaints: true,
    includes_parts: false,
    includes_gas: false,
    prices: {
      "split": 2200,
      "window": 1700
    },
    price: 2200,
    description: "Ordinary 6 Services & Unlimited Normal Complaints Attend (Window includes 1 Wet Service)",
    terms: "All Rates are Basic GST Applicable as per requirement.",
    created_at: new Date().toISOString()
  },
  {
    code: "JACKET 2",
    name: "2 Jacket Service & Unlimited Complaints",
    category: "specialized",
    ac_type: "split",
    services_per_year: 2,
    unlimited_complaints: true,
    includes_parts: false,
    includes_gas: false,
    price: 2599,
    description: "2 Jacket Deep Washing Services & Unlimited Breakdown Complaints Attend",
    terms: "All Rates are Basic GST Applicable as per requirement.",
    created_at: new Date().toISOString()
  },
  {
    code: "JACKET 3",
    name: "3 Jacket Service & Unlimited Complaints",
    category: "specialized",
    ac_type: "split",
    services_per_year: 3,
    unlimited_complaints: true,
    includes_parts: false,
    includes_gas: false,
    price: 3599,
    description: "3 Jacket Deep Washing Services & Unlimited Breakdown Complaints Attend",
    terms: "All Rates are Basic GST Applicable as per requirement.",
    created_at: new Date().toISOString()
  },
  {
    code: "PUMP DOWN",
    name: "Pump Down Service",
    category: "specialized",
    ac_type: "all",
    services_per_year: 1,
    unlimited_complaints: false,
    includes_parts: false,
    includes_gas: false,
    price: 1299,
    description: "Pump Down Service (Gas Top Up Not Included if required)",
    terms: "Per unit basis. All Rates are Basic GST Applicable as per requirement.",
    created_at: new Date().toISOString()
  },
  {
    code: "JET WASH",
    name: "Jet Wash Deep Service",
    category: "specialized",
    ac_type: "all",
    services_per_year: 1,
    unlimited_complaints: false,
    includes_parts: false,
    includes_gas: false,
    price: 1199,
    description: "Full High-Pressure Jet Wash Deep Cleaning for Indoor & Outdoor Coils",
    terms: "Per unit basis. All Rates are Basic GST Applicable as per requirement.",
    created_at: new Date().toISOString()
  }
];

async function seedPlans() {
  try {
    console.log("Checking for existing AMC plans...");
    const snapshot = await db.collection('amc_plans').get();
    
    // Delete existing plans if there are any to avoid duplicates
    if (!snapshot.empty) {
      console.log(`Found ${snapshot.size} existing plans. Deleting them first...`);
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log("Existing plans deleted successfully.");
    }
    
    console.log("Seeding new plans...");
    for (const plan of amcPlans) {
      const docRef = await db.collection('amc_plans').add(plan);
      console.log(`✅ Added plan: "${plan.name}" with ID: ${docRef.id}`);
    }
    
    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding plans:", error);
    process.exit(1);
  }
}

seedPlans();
