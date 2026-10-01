// scripts/seedAllUsers.js - Seed comprehensive system users (Admin, Staff, Technicians) into Firestore
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
    console.error("Firebase credentials file not found.");
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const USERS_TO_SEED = [
  {
    docId: 'usr-super-admin',
    name: "Super Admin",
    email: "extremess0121@gmail.com",
    phone: "9820011000",
    role: "admin",
    password: "ESS@123"
  },
  {
    docId: 'usr-admin',
    name: "Vikram Malhotra (Admin)",
    email: "admin@extremess.com",
    phone: "9820011000",
    role: "admin",
    password: "admin123"
  },
  {
    docId: 'usr-staff',
    name: "Neha Sharma (Dispatcher)",
    email: "staff@extremess.com",
    phone: "9833001122",
    role: "staff",
    password: "staff123"
  },
  {
    docId: 'tech-1',
    name: "Suresh Kumar (Senior Tech)",
    email: "tech@extremess.com",
    phone: "9820011223",
    role: "technician",
    password: "tech123"
  },
  {
    docId: 'tech-2',
    name: "Ramesh Yadav (AC Specialist)",
    email: "ramesh@extremess.com",
    phone: "9820044556",
    role: "technician",
    password: "tech123"
  },
  {
    docId: 'tech-3',
    name: "Deepak Verma (Installation Lead)",
    email: "deepak@extremess.com",
    phone: "9820077889",
    role: "technician",
    password: "tech123"
  }
];

const INITIAL_SERVICE_REQUESTS = [
  {
    docId: 'req-1',
    request_id: "AC-1001",
    name: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul@example.com",
    address: "Flat 402, Sunshine Heights, Andheri West, Mumbai",
    service_type: "AC Repair",
    issue_description: "Cooling not working properly, strange rattling noise from blower unit",
    status: "In Progress",
    technician_id: "tech-1",
    technician_name: "Suresh Kumar (Senior Tech)",
    created_at: new Date(Date.now() - 3600000 * 36).toISOString()
  },
  {
    docId: 'req-2',
    request_id: "AC-1002",
    name: "Priya Patel",
    phone: "9822012345",
    email: "priya@example.com",
    address: "Sector 14, Plot 88, Vashi, Navi Mumbai",
    service_type: "Servicing",
    issue_description: "Pre-summer jet-pump deep cleaning and electrical safety inspection [✅ AMC Covered]",
    status: "Assigned",
    technician_id: "tech-1",
    technician_name: "Suresh Kumar (Senior Tech)",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    docId: 'req-3',
    request_id: "AC-1003",
    name: "Amit Verma",
    phone: "9123456780",
    email: "amit@example.com",
    address: "B-12, Green Park, Pokhran Road 2, Thane",
    service_type: "Installation",
    issue_description: "New 1.5 Ton 5-Star Split AC bracket installation & copper piping",
    status: "Pending",
    technician_id: "",
    technician_name: "",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

async function seed() {
  console.log("🚀 Seeding users and initial requests into Firestore...");
  const salt = await bcrypt.genSalt(10);

  for (const u of USERS_TO_SEED) {
    const emailLower = u.email.toLowerCase();
    const existing = await db.collection('users').where('email', '==', emailLower).get();
    const password_hash = await bcrypt.hash(u.password, salt);

    const docData = {
      name: u.name,
      email: emailLower,
      phone: u.phone,
      role: u.role,
      password_hash: password_hash,
      updated_at: new Date().toISOString()
    };

    if (existing.empty) {
      docData.created_at = new Date().toISOString();
      await db.collection('users').doc(u.docId).set(docData);
      console.log(`✅ Created user: ${u.email} (${u.role}) [ID: ${u.docId}]`);
    } else {
      const existingDoc = existing.docs[0];
      await db.collection('users').doc(existingDoc.id).set(docData, { merge: true });
      console.log(`ℹ️ Updated user: ${u.email} (${u.role}) [ID: ${existingDoc.id}]`);
    }
  }

  // Seed initial service requests if none exist
  const reqSnap = await db.collection('service_requests').limit(1).get();
  if (reqSnap.empty) {
    for (const r of INITIAL_SERVICE_REQUESTS) {
      const { docId, ...data } = r;
      await db.collection('service_requests').doc(docId).set(data);
      console.log(`✅ Seeded sample ticket: ${r.request_id} -> ${r.name}`);
    }
  } else {
    console.log("ℹ️ service_requests collection already has data; skipping ticket seeding.");
  }

  console.log("🎉 Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding error:", err);
  process.exit(1);
});
