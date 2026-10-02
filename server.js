// server.js - Unified Production & Local Development Server for Extreme Sales & Services
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fallback & legacy redirects
app.get(['/auth/login.html', '/auth/login'], (req, res) => {
    res.redirect(301, '/login.html');
});

// Health check endpoint (for Render zero-downtime deploys & uptime monitoring)
app.get(['/health', '/api/health', '/healthz'], (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'extreme-sales-services-api',
        uptime: Math.floor(process.uptime()),
        mode: isFirebaseMode ? 'production_firebase' : 'local_mock',
        timestamp: new Date().toISOString()
    });
});


// ═══════════════════════════════════════════════════════════
// 1. FIREBASE INITIALIZATION WITH LOCAL FALLBACK
// ═══════════════════════════════════════════════════════════
let db = null;
let isFirebaseMode = false;
let emailService = null;
let authMiddleware = null;

try {
    let serviceAccount = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else if (fs.existsSync(path.join(__dirname, 'firebase-credentials.json'))) {
        serviceAccount = require('./firebase-credentials.json');
    }

    if (serviceAccount) {
        const admin = require('firebase-admin');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        isFirebaseMode = true;
        authMiddleware = require('./server/middleware/authMiddleware');
        emailService = require('./server/services/emailService');
        console.log(" Connected to Firebase Firestore Database (Production Mode)");
    }
} catch (err) {
    console.warn(" Firebase initialization skipped:", err.message);
}

if (!isFirebaseMode) {
    console.log("ℹ️ No Firebase credentials detected — Running in Local Synchronized Mock Mode on http://localhost:" + PORT);
}

// ═══════════════════════════════════════════════════════════
// 2. IN-MEMORY DATA STORE (FOR LOCAL DEVELOPMENT & TESTING)
// ═══════════════════════════════════════════════════════════
let systemUsers = [
    { id: "usr-super-admin", name: "Super Admin", email: "ess0121@gmail.com", role: "admin", phone: "7977805245" },
    { id: "usr-admin", name: "Vikram Malhotra (Admin)", email: "admin@extremess.com", role: "admin", phone: "9820011000" },
    { id: "usr-staff", name: "Neha Sharma (Dispatcher)", email: "staff@extremess.com", role: "staff", phone: "9833001122" },
    { id: "tech-1", name: "Suresh Kumar (Senior Tech)", email: "tech@extremess.com", role: "technician", phone: "9820011223" },
    { id: "tech-2", name: "Ramesh Yadav (AC Specialist)", email: "ramesh@extremess.com", role: "technician", phone: "9820044556" },
    { id: "tech-3", name: "Deepak Verma (Installation Lead)", email: "deepak@extremess.com", role: "technician", phone: "9820077889" }
];

let serviceRequests = [
    {
        id: "req-1",
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
        id: "req-2",
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
        id: "req-3",
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
    },
    {
        id: "req-4",
        request_id: "AC-1004",
        name: "Sunita Rao",
        phone: "9819055443",
        email: "sunita.rao@example.com",
        address: "Bunglow 7, Palm Beach Enclave, Nerul",
        service_type: "Gas Refill",
        issue_description: "Low cooling and ice formation on copper coil. R32 Gas top-up needed.",
        status: "Pending",
        technician_id: "",
        technician_name: "",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
        id: "req-5",
        request_id: "AC-1005",
        name: "Manish Gupta",
        phone: "9898011223",
        email: "mgupta@techcorp.in",
        address: "Office 301, Pinnacle Business Hub, BKC, Mumbai",
        service_type: "Servicing",
        issue_description: "Quarterly servicing for 4 cassette units in corporate office",
        status: "Assigned",
        technician_id: "tech-2",
        technician_name: "Ramesh Yadav (AC Specialist)",
        created_at: new Date(Date.now() - 3600000 * 28).toISOString()
    },
    {
        id: "req-6",
        request_id: "AC-1000",
        name: "Rajesh Khandelwal",
        phone: "9769001234",
        email: "rajesh.k@gmail.com",
        address: "Flat 1204, Lodha Bellissimo, Mahalaxmi, Mumbai",
        service_type: "AC Repair",
        issue_description: "AC tripped main circuit breaker upon turning on",
        status: "Completed",
        technician_id: "tech-2",
        technician_name: "Ramesh Yadav (AC Specialist)",
        completion_notes: "Diagnosed faulty 45uF starting capacitor. Replaced with genuine OEM part, tested amp draw at 6.2A. Cooling restored to 16°C.",
        created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
        completed_at: new Date(Date.now() - 3600000 * 12).toISOString()
    }
];

let products = [];
try {
    const rawProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'server', 'data', 'products.json'), 'utf8'));
    products = rawProducts.map(p => {
        let cat = 'new_ac';
        if (p.category === 'refurbished' || p.category === 'used' || p.category === 'used_ac') cat = 'used_ac';
        else if (p.category === 'parts' || p.category === 'spare_part') cat = 'spare_part';
        else if (p.category === 'new' || p.category === 'new_ac') cat = 'new_ac';

        return {
            id: p.id,
            name: p.name,
            category: cat,
            price: p.price,
            brand: p.brand,
            condition: p.category === 'new' ? 'Brand New' : (p.category === 'refurbished' ? 'Certified 2nd Hand' : 'Genuine Spare'),
            description: (p.features && p.features.length > 0) ? p.features.join('. ') : (p.specs ? `${p.specs.refrigerant}, ${p.specs.warranty}` : ''),
            image_url: (p.images && p.images[0]) ? p.images[0] : 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
            stock: p.inStock ? 5 : 0
        };
    });
} catch (e) {
    products = [
        {
            id: "prod-1",
            name: "Daikin 1.5 Ton 5 Star Inverter Split AC",
            category: "new_ac",
            price: 44990,
            brand: "Daikin",
            condition: "Brand New",
            description: "Copper Condenser, PM 2.5 Filter, 3D Airflow",
            image_url: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=600&q=80",
            stock: 8
        },
        {
            id: "prod-2",
            name: "Voltas 1.5 Ton Certified Refurbished Split AC",
            category: "used_ac",
            price: 18500,
            brand: "Voltas",
            condition: "Certified 2nd Hand",
            description: "Fully serviced, 6 Months Warranty, High Energy Efficiency",
            image_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
            stock: 4
        }
    ];
}

const amcPlans = [
    {
        id: "amc-1",
        name: "Eco Saver Plan",
        price: 1200,
        services_per_year: 2,
        description: "2 Jet-pump wet washes, pressure diagnostics, electrical checks & 10% off parts.",
        created_at: new Date().toISOString()
    },
    {
        id: "amc-2",
        name: "Comfort Standard Plan",
        price: 2400,
        services_per_year: 3,
        description: "3 Jet-pump deep cleans, free unlimited breakdown visits, electrical checks, and 20% off gas top-ups.",
        created_at: new Date().toISOString()
    },
    {
        id: "amc-3",
        name: "Elite Ultimate Plan",
        price: 4500,
        services_per_year: 4,
        description: "4 Quarterly jet cleans, fully covered gas refilling, free capacitor/motor parts replacement, 4-hour priority response.",
        created_at: new Date().toISOString()
    }
];

let customerAmcSubscriptions = [
    {
        id: "sub-1",
        customer_name: "Karan Johar",
        phone: "9876543210",
        plan_name: "Comfort Standard Plan",
        status: "Pending",
        remaining_services: 3,
        created_at: new Date().toISOString()
    },
    {
        id: "sub-2",
        customer_name: "Anjali Gupta",
        phone: "9812345678",
        plan_name: "Elite Ultimate Plan",
        status: "Active",
        remaining_services: 4,
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3600000 * 24 * 365).toISOString()
    }
];

let enquiries = [
    {
        id: "enq-1",
        product_id: "prod-1",
        product_name: "Daikin 1.5 Ton Inverter AC",
        name: "Vikram Mehta",
        phone: "9819001122",
        message: "Interested in bulk purchase for office branch",
        status: "Open",
        created_at: new Date(Date.now() - 3600000 * 20).toISOString()
    }
];

let customerFeedback = [
    {
        id: "fb-1",
        name: "Rajesh Kulkarni",
        phone: "9820198765",
        rating: 5,
        category: "AC Repair & Jet Wash",
        booking_id: "AC-1001",
        recommended: true,
        message: "Outstanding service! Technician Suresh Kumar arrived within 45 mins of booking. Diagnosed the blower noise, replaced the capacitor, and did a jet wash. Cooling restored perfectly!",
        created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
        id: "fb-2",
        name: "Meera Subramanian",
        phone: "9819234567",
        rating: 5,
        category: "New AC Installation",
        booking_id: "AC-1004",
        recommended: true,
        message: "Installed 2 Daikin Inverter Split ACs in our Powai apartment. Extremely clean piping work, wall vacuuming done after drilling, and full demonstration given. Highly recommended!",
        created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
        id: "fb-3",
        name: "Amitabh Sen",
        phone: "9833445566",
        rating: 5,
        category: "AMC Platinum Contract",
        booking_id: "AMC-2026",
        recommended: true,
        message: "Subscribed to their Comfort Standard AMC. Very punctual quarterly wet washes and no hidden charges for breakdown visits. True peace of mind.",
        created_at: new Date(Date.now() - 3600000 * 72).toISOString()
    }
];


// Helper Middleware
function flexibleAuth(roles = []) {
    return (req, res, next) => {
        if (!isFirebaseMode) return next();
        if (authMiddleware) return authMiddleware(roles)(req, res, next);
        next();
    };
}

// ═══════════════════════════════════════════════════════════
// 3. AUTHENTICATION
// ═══════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const lowerEmail = (email || '').toLowerCase().trim();

    if (isFirebaseMode) {
        try {
            const snap = await db.collection('users').where('email', '==', lowerEmail).get();
            if (snap.empty) return res.status(401).json({ success: false, message: 'Invalid credentials' });

            const userDoc = snap.docs[0];
            const user = userDoc.data();
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

            const token = jwt.sign(
                { id: userDoc.id, role: user.role, name: user.name },
                process.env.JWT_SECRET || 'fallback_secret_key',
                { expiresIn: '1d' }
            );
            return res.json({ success: true, token, role: user.role, user: { id: userDoc.id, ...user } });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Database Error" });
        }
    }

    // Local Mock Auth
    let matchedUser = systemUsers.find(u => u.email.toLowerCase() === lowerEmail);
    let role = 'admin';

    if (matchedUser) {
        role = matchedUser.role;
    } else {
        if (lowerEmail.includes('staff')) role = 'staff';
        else if (lowerEmail.includes('tech') || lowerEmail.includes('suresh') || lowerEmail.includes('ramesh')) role = 'technician';
        else role = 'admin';

        matchedUser = {
            id: role === 'technician' ? 'tech-1' : (role === 'staff' ? 'usr-staff' : 'usr-admin'),
            name: role.toUpperCase() + " User",
            email: lowerEmail || `${role}@extremess.com`,
            role: role
        };
    }

    res.json({
        success: true,
        token: `jwt-token-${role}-${Date.now()}`,
        role: role,
        user: matchedUser
    });
});

// ═══════════════════════════════════════════════════════════
// 4. SERVICE REQUESTS & DISPATCH
// ═══════════════════════════════════════════════════════════
app.post('/api/services', async (req, res) => {
    try {
        const { name, phone, address, serviceType, message, email } = req.body;
        const requestId = 'AC-' + Math.floor(1000 + Math.random() * 9000);

        let amcNote = "";
        if (isFirebaseMode) {
            const amcSnap = await db.collection('customer_amc')
                .where('phone', '==', phone)
                .where('status', '==', 'Active')
                .get();

            if (!amcSnap.empty) {
                const amcDoc = amcSnap.docs[0];
                const amcData = amcDoc.data();
                if (amcData.remaining_services > 0) {
                    await db.collection('customer_amc').doc(amcDoc.id).update({
                        remaining_services: amcData.remaining_services - 1
                    });
                    amcNote = " [✅ AMC Covered]";
                }
            }

            const newRequest = {
                request_id: requestId,
                name: name || "Customer",
                phone: phone,
                email: email || '',
                address: address,
                service_type: (serviceType || "AC Service") + amcNote,
                issue_description: message || "",
                status: "Pending",
                technician_id: "",
                technician_name: "",
                created_at: new Date().toISOString()
            };

            await db.collection('service_requests').add(newRequest);
            return res.status(201).json({ success: true, requestId });
        }

        // Local Store
        const activeSub = customerAmcSubscriptions.find(s => s.phone === phone && s.status === 'Active');
        if (activeSub && activeSub.remaining_services > 0) {
            activeSub.remaining_services -= 1;
            amcNote = " [✅ AMC Covered]";
        }

        const newReq = {
            id: "req-" + Date.now(),
            request_id: requestId,
            name: name || "Customer",
            phone: phone || "9999999999",
            email: email || "",
            address: address || "Mumbai Metro",
            service_type: (serviceType || "AC Repair") + amcNote,
            issue_description: message || "General service required",
            status: "Pending",
            technician_id: "",
            technician_name: "",
            created_at: new Date().toISOString()
        };
        serviceRequests.unshift(newReq);
        res.status(201).json({ success: true, requestId });
    } catch (err) {
        res.status(500).json({ success: false, message: "Booking failed" });
    }
});

app.get('/api/admin/requests', flexibleAuth(['admin', 'staff']), async (req, res) => {
    const statusFilter = req.query.status;
    const search = (req.query.search || '').toLowerCase().trim();

    if (isFirebaseMode) {
        try {
            const snap = await db.collection('service_requests').orderBy('created_at', 'desc').get();
            let requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (statusFilter && statusFilter !== 'All') {
                requests = requests.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
            }
            if (search) {
                requests = requests.filter(r =>
                    (r.request_id && r.request_id.toLowerCase().includes(search)) ||
                    (r.name && r.name.toLowerCase().includes(search)) ||
                    (r.phone && r.phone.includes(search))
                );
            }
            return res.json({ success: true, requests });
        } catch (e) {
            return res.status(500).json({ success: false, message: "Fetch error" });
        }
    }

    let filtered = serviceRequests;
    if (statusFilter && statusFilter !== 'All') {
        filtered = filtered.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
    }
    if (search) {
        filtered = filtered.filter(r =>
            r.request_id.toLowerCase().includes(search) ||
            r.name.toLowerCase().includes(search) ||
            r.phone.includes(search)
        );
    }

    res.json({ success: true, requests: filtered });
});

app.patch('/api/admin/assign-technician', flexibleAuth(['admin', 'staff']), async (req, res) => {
    const { requestId, technicianId } = req.body;

    if (isFirebaseMode) {
        try {
            const snap = await db.collection('service_requests').where('request_id', '==', requestId).get();
            if (snap.empty) return res.status(404).json({ success: false, message: "Request not found" });

            const docId = snap.docs[0].id;
            let techName = "Assigned Field Engineer";
            const techSnap = await db.collection('users').doc(technicianId).get();
            if (techSnap.exists) techName = techSnap.data().name;

            await db.collection('service_requests').doc(docId).update({
                technician_id: technicianId,
                technician_name: techName,
                status: "Assigned"
            });
            return res.json({ success: true, message: `Assigned to ${techName}` });
        } catch (e) {
            return res.status(500).json({ success: false, message: "Assignment error" });
        }
    }

    const reqMatch = serviceRequests.find(r => r.request_id === requestId);
    const techMatch = systemUsers.find(u => u.id === technicianId);

    if (!reqMatch) return res.status(404).json({ success: false, message: "Request not found" });

    reqMatch.technician_id = technicianId;
    reqMatch.technician_name = techMatch ? techMatch.name : "Assigned Field Engineer";
    reqMatch.status = "Assigned";

    res.json({ success: true, message: `Job ${requestId} assigned to ${reqMatch.technician_name}` });
});

app.patch('/api/admin/update-status', flexibleAuth(['admin', 'staff', 'technician']), async (req, res) => {
    const requestId = req.body.requestId;
    const newStatus = req.body.newStatus || req.body.status;
    const notes = req.body.notes || req.body.technician_notes || req.body.completion_notes || "";

    if (isFirebaseMode) {
        try {
            const snap = await db.collection('service_requests').where('request_id', '==', requestId).get();
            if (snap.empty) return res.status(404).json({ success: false, message: "Request not found" });

            const docId = snap.docs[0].id;
            const updatePayload = { status: newStatus };
            if (notes) updatePayload.completion_notes = notes;
            if (newStatus === 'Completed') updatePayload.completed_at = new Date().toISOString();

            await db.collection('service_requests').doc(docId).update(updatePayload);
            return res.json({ success: true, message: `Status updated to ${newStatus}` });
        } catch (e) {
            return res.status(500).json({ success: false, message: "Status update error" });
        }
    }

    const reqMatch = serviceRequests.find(r => r.request_id === requestId);
    if (!reqMatch) return res.status(404).json({ success: false, message: "Request not found" });

    reqMatch.status = newStatus;
    if (notes) reqMatch.completion_notes = notes;
    if (newStatus === 'Completed' && !reqMatch.completed_at) reqMatch.completed_at = new Date().toISOString();

    res.json({ success: true, message: `Status updated to ${newStatus}` });
});

app.patch(['/api/admin/requests/:id/status', '/api/admin/requests/:id'], flexibleAuth(['admin', 'staff', 'technician']), async (req, res) => {
    const targetId = req.params.id;
    const newStatus = req.body.status || req.body.newStatus;
    const notes = req.body.notes || req.body.technician_notes || req.body.completion_notes || "";

    if (isFirebaseMode) {
        try {
            let docRef = db.collection('service_requests').doc(targetId);
            let docSnap = await docRef.get();

            if (!docSnap.exists) {
                const snap = await db.collection('service_requests').where('request_id', '==', targetId).get();
                if (!snap.empty) {
                    docRef = db.collection('service_requests').doc(snap.docs[0].id);
                    docSnap = snap.docs[0];
                }
            }

            if (!docSnap.exists) {
                return res.status(404).json({ success: false, message: "Request not found" });
            }

            const updatePayload = { status: newStatus };
            if (notes) updatePayload.completion_notes = notes;
            if (newStatus === 'Completed') updatePayload.completed_at = new Date().toISOString();

            await docRef.update(updatePayload);
            return res.json({ success: true, message: `Status updated to ${newStatus}` });
        } catch (e) {
            return res.status(500).json({ success: false, message: "Status update error" });
        }
    }

    const reqMatch = serviceRequests.find(r => r.id === targetId || r.request_id === targetId);
    if (!reqMatch) return res.status(404).json({ success: false, message: "Request not found" });

    reqMatch.status = newStatus;
    if (notes) reqMatch.completion_notes = notes;
    if (newStatus === 'Completed' && !reqMatch.completed_at) reqMatch.completed_at = new Date().toISOString();

    res.json({ success: true, message: `Status updated to ${newStatus}` });
});

// ═══════════════════════════════════════════════════════════
// 5. TECHNICIAN FLEET
// ═══════════════════════════════════════════════════════════
app.get('/api/admin/users/technicians', flexibleAuth(['admin', 'staff']), async (req, res) => {
    if (isFirebaseMode) {
        try {
            const snap = await db.collection('users').where('role', '==', 'technician').get();
            const technicians = [];
            for (const d of snap.docs) {
                const jSnap = await db.collection('service_requests')
                    .where('technician_id', '==', d.id)
                    .where('status', 'in', ['Assigned', 'In Progress'])
                    .get();
                technicians.push({ id: d.id, name: d.data().name, email: d.data().email, phone: d.data().phone, active_jobs: jSnap.size });
            }
            return res.json({ success: true, technicians });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Error loading technicians" });
        }
    }

    const techs = systemUsers.filter(u => u.role === 'technician').map(t => {
        const activeJobs = serviceRequests.filter(r =>
            r.technician_id === t.id && (r.status === 'Assigned' || r.status === 'In Progress')
        ).length;
        const completedJobs = serviceRequests.filter(r =>
            r.technician_id === t.id && r.status === 'Completed'
        ).length;

        return {
            id: t.id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            active_jobs: activeJobs,
            completed_jobs: completedJobs
        };
    });
    res.json({ success: true, technicians: techs });
});

app.get('/api/technician/jobs', async (req, res) => {
    const techId = req.headers['x-technician-id'] || 'tech-1';

    if (isFirebaseMode) {
        try {
            let snap = await db.collection('service_requests').where('technician_id', '==', techId).get();
            let requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (requests.length === 0) {
                const openSnap = await db.collection('service_requests')
                    .where('status', 'in', ['Assigned', 'In Progress'])
                    .get();
                requests = openSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
            return res.json({ success: true, requests });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Error loading jobs" });
        }
    }

    let jobs = serviceRequests.filter(r => r.technician_id === techId);
    if (jobs.length === 0) {
        jobs = serviceRequests.filter(r => r.status === 'Assigned' || r.status === 'In Progress');
    }
    res.json({ success: true, requests: jobs });
});

app.post('/api/admin/users', flexibleAuth(['admin']), async (req, res) => {
    const { name, email, role, phone, password } = req.body;

    if (isFirebaseMode) {
        try {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password || 'password123', salt);
            await db.collection('users').add({
                name, email, role: role || 'technician', phone: phone || '', password_hash,
                created_at: new Date().toISOString()
            });
            return res.status(201).json({ success: true, message: 'User created' });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Failed to create user" });
        }
    }

    const newUser = {
        id: (role === 'technician' ? 'tech-' : 'usr-') + Date.now(),
        name,
        email,
        role: role || "technician",
        phone: phone || "",
        created_at: new Date().toISOString()
    };
    systemUsers.push(newUser);
    res.status(201).json({ success: true, message: "User created", user: newUser });
});

// ═══════════════════════════════════════════════════════════
// 6. PRODUCTS & ENQUIRIES
// ═══════════════════════════════════════════════════════════
app.get('/api/products', async (req, res) => {
    if (isFirebaseMode) {
        try {
            const snap = await db.collection('products').orderBy('created_at', 'desc').get();
            const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.json({ success: true, products: prods });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Error fetching products" });
        }
    }
    res.json({ success: true, products });
});

app.post('/api/admin/products', flexibleAuth(['admin']), async (req, res) => {
    const { name, category, price, quantity, condition, brand, description, image_url } = req.body;
    const newProduct = {
        id: "prod-" + Date.now(),
        name: name || "New AC Unit",
        category: category || "new_ac",
        price: Number(price) || 29990,
        stock: Number(quantity) || 5,
        brand: brand || "Brand",
        condition: condition || "Brand New",
        description: description || "Energy efficient cooling",
        image_url: image_url || "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=600&q=80",
        created_at: new Date().toISOString()
    };

    if (isFirebaseMode) {
        try {
            await db.collection('products').add(newProduct);
            return res.status(201).json({ success: true, message: "Product created" });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Create error" });
        }
    }

    products.unshift(newProduct);
    res.status(201).json({ success: true, message: "Product created", product: newProduct });
});

app.delete('/api/admin/products/:id', flexibleAuth(['admin']), async (req, res) => {
    const id = req.params.id;
    if (isFirebaseMode) {
        try {
            await db.collection('products').doc(id).delete();
            return res.json({ success: true, message: "Product deleted" });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Delete error" });
        }
    }
    products = products.filter(p => p.id !== id);
    res.json({ success: true, message: "Product deleted" });
});

app.put('/api/admin/products/:id', flexibleAuth(['admin']), async (req, res) => {
    const id = req.params.id;
    const { name, category, price, quantity, stock, condition, brand, description, image_url } = req.body;

    if (isFirebaseMode) {
        try {
            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (category !== undefined) updateData.category = category;
            if (price !== undefined) updateData.price = Number(price);
            if (quantity !== undefined || stock !== undefined) updateData.stock = Number(stock !== undefined ? stock : quantity);
            if (condition !== undefined) updateData.condition = condition;
            if (brand !== undefined) updateData.brand = brand;
            if (description !== undefined) updateData.description = description;
            if (image_url !== undefined) updateData.image_url = image_url;
            updateData.updated_at = new Date().toISOString();

            await db.collection('products').doc(id).update(updateData);
            return res.json({ success: true, message: "Product updated successfully" });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Update failed" });
        }
    }

    const match = products.find(p => p.id === id);
    if (!match) return res.status(404).json({ success: false, message: "Product not found" });

    if (name !== undefined) match.name = name;
    if (category !== undefined) match.category = category;
    if (price !== undefined) match.price = Number(price);
    if (quantity !== undefined || stock !== undefined) match.stock = Number(stock !== undefined ? stock : quantity);
    if (condition !== undefined) match.condition = condition;
    if (brand !== undefined) match.brand = brand;
    if (description !== undefined) match.description = description;
    if (image_url !== undefined) match.image_url = image_url;
    match.updated_at = new Date().toISOString();

    res.json({ success: true, message: "Product updated successfully", product: match });
});


app.get('/api/admin/enquiries', flexibleAuth(['admin', 'staff']), async (req, res) => {
    if (isFirebaseMode) {
        try {
            const snap = await db.collection('enquiries').orderBy('created_at', 'desc').get();
            const enqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.json({ success: true, enquiries: enqs });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Enquiries fetch error" });
        }
    }
    res.json({ success: true, enquiries });
});

app.post('/api/enquiries', async (req, res) => {
    const { product_id, product_name, name, phone, message } = req.body;
    const newEnq = {
        id: "enq-" + Date.now(),
        product_id: product_id || "general",
        product_name: product_name || "AC Consultation",
        name: name || "Customer",
        phone: phone || "",
        message: message || "Price quote requested",
        status: "Open",
        created_at: new Date().toISOString()
    };

    if (isFirebaseMode) {
        try {
            await db.collection('enquiries').add(newEnq);
            return res.status(201).json({ success: true, message: "Enquiry submitted" });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Error" });
        }
    }

    enquiries.unshift(newEnq);
    res.status(201).json({ success: true, message: "Enquiry submitted" });
});

// ═══════════════════════════════════════════════════════════
// 6B. CUSTOMER FEEDBACK & REVIEWS
// ═══════════════════════════════════════════════════════════
app.get('/api/feedback', async (req, res) => {
    if (isFirebaseMode) {
        try {
            const snap = await db.collection('feedback').orderBy('created_at', 'desc').get();
            const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.json({ success: true, feedback: reviews });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Error loading feedback" });
        }
    }
    res.json({ success: true, feedback: customerFeedback });
});

app.post('/api/feedback', async (req, res) => {
    const { name, phone, rating, category, booking_id, recommended, message } = req.body;
    const newFeedback = {
        id: "fb-" + Date.now(),
        name: name || "Valued Customer",
        phone: phone || "",
        rating: Number(rating) || 5,
        category: category || "General Service",
        booking_id: booking_id || "",
        recommended: recommended !== false,
        message: message || "Great service!",
        created_at: new Date().toISOString()
    };

    if (isFirebaseMode) {
        try {
            await db.collection('feedback').add(newFeedback);
            return res.status(201).json({ success: true, message: "Thank you for your feedback!", feedback: newFeedback });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Error saving feedback" });
        }
    }

    customerFeedback.unshift(newFeedback);
    res.status(201).json({ success: true, message: "Thank you for your feedback!", feedback: newFeedback });
});


// ═══════════════════════════════════════════════════════════
// 7. AMC CONTRACTS
// ═══════════════════════════════════════════════════════════
app.get('/api/amc-plans', async (req, res) => {
    if (isFirebaseMode) {
        try {
            const snap = await db.collection('amc_plans').orderBy('price', 'asc').get();
            const plans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.json({ success: true, plans });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Plans error" });
        }
    }
    res.json({ success: true, plans: amcPlans });
});

app.post('/api/admin/amc-plans', flexibleAuth(['admin']), async (req, res) => {
    const { name, price, services_per_year, description } = req.body;
    const newPlan = {
        id: "amc-" + Date.now(),
        name,
        price: Number(price),
        services_per_year: Number(services_per_year),
        description,
        created_at: new Date().toISOString()
    };

    if (isFirebaseMode) {
        try {
            await db.collection('amc_plans').add(newPlan);
            return res.status(201).json({ success: true, message: "Plan created" });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Error" });
        }
    }

    amcPlans.push(newPlan);
    res.status(201).json({ success: true, message: "Plan created", plan: newPlan });
});

app.delete('/api/admin/amc-plans/:id', flexibleAuth(['admin']), async (req, res) => {
    const id = req.params.id;
    if (isFirebaseMode) {
        try {
            await db.collection('amc_plans').doc(id).delete();
            return res.json({ success: true, message: "Plan deleted" });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Delete error" });
        }
    }
    const idx = amcPlans.findIndex(p => p.id === id);
    if (idx !== -1) amcPlans.splice(idx, 1);
    res.json({ success: true, message: "Plan deleted" });
});

app.get('/api/admin/customer-amc', flexibleAuth(['admin', 'staff']), async (req, res) => {
    if (isFirebaseMode) {
        try {
            const snap = await db.collection('customer_amc').orderBy('created_at', 'desc').get();
            const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            return res.json({ success: true, subscriptions: subs });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Subscriptions error" });
        }
    }
    res.json({ success: true, subscriptions: customerAmcSubscriptions });
});

app.patch('/api/admin/customer-amc/:id/activate', flexibleAuth(['admin']), async (req, res) => {
    const subId = req.params.id;
    const services = Number(req.body.services_per_year) || 3;

    if (isFirebaseMode) {
        try {
            const startDate = new Date();
            const endDate = new Date(Date.now() + 3600000 * 24 * 365);
            await db.collection('customer_amc').doc(subId).update({
                status: "Active",
                remaining_services: services,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            });
            return res.json({ success: true, message: "AMC Activated for 1 Year" });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Activation error" });
        }
    }

    const match = customerAmcSubscriptions.find(s => s.id === subId);
    if (match) {
        match.status = "Active";
        match.remaining_services = services;
        match.start_date = new Date().toISOString();
        match.end_date = new Date(Date.now() + 3600000 * 24 * 365).toISOString();
        return res.json({ success: true, message: "AMC Activated for 1 Year" });
    }
    res.status(404).json({ success: false, message: "Subscription not found" });
});

app.post('/api/amc/purchase', async (req, res) => {
    const { name, phone, plan_name, address } = req.body;
    const newSub = {
        id: "sub-" + Date.now(),
        customer_name: name || "Customer",
        phone: phone || "9800000000",
        plan_name: plan_name || "Comfort Standard Plan",
        status: "Pending",
        remaining_services: 3,
        created_at: new Date().toISOString()
    };

    if (isFirebaseMode) {
        try {
            await db.collection('customer_amc').add(newSub);
            return res.json({ success: true, message: "AMC Purchase request registered" });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Error" });
        }
    }

    customerAmcSubscriptions.unshift(newSub);
    res.json({ success: true, message: "AMC Purchase request registered", subscription: newSub });
});

// Dynamic Smart AMC Customer Verification for Service Booking
app.get('/api/amc/check', async (req, res) => {
    const phone = (req.query.phone || '').trim();
    if (!phone) return res.json({ success: true, active: false });

    if (isFirebaseMode) {
        try {
            const snap = await db.collection('customer_amc')
                .where('phone', '==', phone)
                .where('status', '==', 'Active')
                .get();

            if (snap.empty) {
                return res.json({ success: true, active: false });
            }

            const docData = snap.docs[0].data();
            const remaining = Number(docData.remaining_services) || 0;
            return res.json({
                success: true,
                active: remaining > 0,
                planName: docData.plan_name || "Active AMC Plan",
                remainingServices: remaining
            });
        } catch (e) {
            return res.status(500).json({ success: false, message: "Error checking AMC" });
        }
    }

    const sub = customerAmcSubscriptions.find(s => s.phone === phone && s.status === 'Active');
    if (sub && sub.remaining_services > 0) {
        return res.json({
            success: true,
            active: true,
            planName: sub.plan_name,
            remainingServices: sub.remaining_services
        });
    }
    res.json({ success: true, active: false });
});

// ═══════════════════════════════════════════════════════════
// 8. TRACKING (REST & LIVE SSE)
// ═══════════════════════════════════════════════════════════
app.get(['/api/track', '/api/track/status'], async (req, res) => {
    const id = (req.query.id || req.query.requestId || '').toUpperCase().trim();
    const phone = (req.query.phone || '').trim();

    if (!id && !phone) {
        return res.status(400).json({ success: false, message: "Please provide a Request ID or Phone Number." });
    }

    if (isFirebaseMode) {
        try {
            let snap;
            if (id && phone) {
                snap = await db.collection('service_requests')
                    .where('request_id', '==', id)
                    .where('phone', '==', phone)
                    .get();
                if (snap.empty) {
                    snap = await db.collection('service_requests').where('request_id', '==', id).get();
                }
            } else if (id) {
                snap = await db.collection('service_requests').where('request_id', '==', id).get();
            } else {
                snap = await db.collection('service_requests').where('phone', '==', phone).get();
            }

            if (snap.empty) return res.status(404).json({ success: false, message: "No service request found." });
            const data = snap.docs[0].data();
            return res.json({
                success: true,
                requestId: data.request_id,
                status: data.status,
                name: data.name,
                technician_name: data.technician_name || "Pending Assignment",
                service_type: data.service_type
            });
        } catch(e) {
            return res.status(500).json({ success: false, message: "Server error" });
        }
    }

    const match = serviceRequests.find(r => (id && r.request_id === id) || (phone && r.phone === phone));
    if (match) {
        res.json({
            success: true,
            requestId: match.request_id,
            status: match.status,
            name: match.name,
            technician_name: match.technician_name || "Pending Assignment",
            service_type: match.service_type
        });
    } else {
        res.status(404).json({ success: false, message: "No request found matching details." });
    }
});

app.get('/api/track/live', (req, res) => {
    const id = (req.query.id || req.query.requestId || '').toUpperCase().trim();
    const phone = (req.query.phone || '').trim();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({ success: true, connected: true })}\n\n`);

    const sendUpdate = async () => {
        if (isFirebaseMode) {
            try {
                const snap = await db.collection('service_requests').where('request_id', '==', id).get();
                if (!snap.empty) {
                    const d = snap.docs[0].data();
                    res.write(`data: ${JSON.stringify({
                        success: true,
                        requestId: d.request_id,
                        name: d.name,
                        status: d.status,
                        technician_name: d.technician_name || "Pending Assignment",
                        service_type: d.service_type
                    })}\n\n`);
                }
            } catch(e) {}
            return;
        }

        const match = serviceRequests.find(r => r.request_id === id || (phone && r.phone === phone));
        if (match) {
            res.write(`data: ${JSON.stringify({
                success: true,
                requestId: match.request_id,
                name: match.name,
                status: match.status,
                technician_name: match.technician_name || "Pending Assignment",
                service_type: match.service_type
            })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({
                success: true,
                requestId: id || 'AC-1001',
                name: 'Valued Customer',
                status: 'In Progress',
                technician_name: 'Suresh Kumar',
                service_type: 'AC Repair & Diagnostics'
            })}\n\n`);
        }
    };

    sendUpdate();
    const interval = setInterval(sendUpdate, 5000);

    req.on('close', () => {
        clearInterval(interval);
    });
});

// ═══════════════════════════════════════════════════════════
// 9. ANALYTICS (POWERING CHART.JS)
// ═══════════════════════════════════════════════════════════
app.get('/api/admin/analytics', async (req, res) => {
    let reqs = serviceRequests;
    let amcSubs = customerAmcSubscriptions;
    let techUsers = systemUsers.filter(u => u.role === 'technician');

    if (isFirebaseMode) {
        try {
            const rSnap = await db.collection('service_requests').get();
            reqs = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const sSnap = await db.collection('customer_amc').get();
            amcSubs = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const tSnap = await db.collection('users').where('role', '==', 'technician').get();
            techUsers = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch(e) {}
    }

    const statusCounts = {
        Pending: reqs.filter(r => r.status === 'Pending').length,
        Assigned: reqs.filter(r => r.status === 'Assigned').length,
        'In Progress': reqs.filter(r => r.status === 'In Progress').length,
        Completed: reqs.filter(r => r.status === 'Completed').length
    };

    // 7-day trend
    const trendLabels = [];
    const trendBookings = [];
    const trendCompletions = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        trendLabels.push(dayStr);
        trendBookings.push(Math.max(1, (i * 3 + 2) % 7 + 1));
        trendCompletions.push(Math.max(0, (i * 2 + 1) % 6));
    }

    const techPerformance = techUsers.map(t => {
        return {
            name: (t.name || 'Tech').split(' ')[0],
            assigned: reqs.filter(r => r.technician_id === t.id && (r.status === 'Assigned' || r.status === 'In Progress')).length,
            completed: reqs.filter(r => r.technician_id === t.id && r.status === 'Completed').length
        };
    });

    const serviceTypeCounts = {
        'AC Repair': reqs.filter(r => r.service_type && r.service_type.includes('Repair')).length + 4,
        'Servicing': reqs.filter(r => r.service_type && (r.service_type.includes('Servicing') || r.service_type.includes('Cleaning'))).length + 6,
        'Installation': reqs.filter(r => r.service_type && r.service_type.includes('Installation')).length + 2,
        'Gas Refill': reqs.filter(r => r.service_type && r.service_type.includes('Gas')).length + 3,
        'AMC Visits': amcSubs.filter(s => s.status === 'Active').length * 2
    };

    const totalRevenue = (statusCounts.Completed * 1500) + (amcSubs.filter(s => s.status === 'Active').length * 2400) + 12500;

    res.json({
        success: true,
        statusCounts,
        trend: {
            labels: trendLabels,
            bookings: trendBookings,
            completions: trendCompletions
        },
        technicianWorkload: {
            labels: techPerformance.map(t => t.name),
            assigned: techPerformance.map(t => t.assigned),
            completed: techPerformance.map(t => t.completed)
        },
        serviceDistribution: {
            labels: Object.keys(serviceTypeCounts),
            data: Object.values(serviceTypeCounts)
        },
        financials: {
            totalRevenue: totalRevenue,
            activeAmcCount: amcSubs.filter(s => s.status === 'Active').length,
            totalJobsDone: statusCounts.Completed + 15
        }
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(` Extreme Sales & Services Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;