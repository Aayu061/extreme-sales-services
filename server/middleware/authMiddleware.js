// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const DEMO_USERS = {
    admin: { id: "usr-admin", name: "Vikram Malhotra (Admin)", email: "admin@extremess.com", role: "admin" },
    staff: { id: "usr-staff", name: "Neha Sharma (Dispatcher)", email: "staff@extremess.com", role: "staff" },
    technician: { id: "tech-1", name: "Suresh Kumar (Senior Tech)", email: "tech@extremess.com", role: "technician" }
};

const authMiddleware = (roles = []) => {
    // If we pass a single role as a string, make it an array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        // 1. Get the token from "Authorization" header
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
        }

        // Verify real JWT token
        try {
            let decoded = null;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
            } catch (err1) {
                // Check with fallback secret in case server restarted with default secret
                if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'fallback_secret_key') {
                    try {
                        decoded = jwt.verify(token, 'fallback_secret_key');
                    } catch (err2) {
                        throw err1;
                    }
                } else {
                    throw err1;
                }
            }

            // Attach the decoded user payload to the req object
            req.user = decoded;

            // Check if the user's role is allowed
            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ success: false, message: 'Forbidden: You do not have the required role' });
            }

            next();
        } catch (error) {
            console.error("JWT Error:", error.message);
            res.status(401).json({ success: false, message: 'Invalid or Expired Token' });
        }
    };
};

module.exports = authMiddleware;

