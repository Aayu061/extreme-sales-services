// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'your_super_secret_jwt_key_change_this_in_production' || secret === 'your_jwt_secret_key') {
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing or using default placeholder in production.');
            return null; // Fail closed
        }
        // Local non-production development fallback with explicit warning
        return 'dev_secret_only_for_local_development_ess_2026';
    }
    return secret;
}

const authMiddleware = (roles = []) => {
    const roleList = typeof roles === 'string' ? [roles] : (Array.isArray(roles) ? roles : []);

    return (req, res, next) => {
        const secret = getJwtSecret();
        if (!secret) {
            return res.status(500).json({
                success: false,
                message: 'Server authentication configuration error: JWT_SECRET must be configured.'
            });
        }

        // 1. Get the token from "Authorization" header
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
        }

        // 2. Verify JWT token strictly
        try {
            const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

            // Attach authoritative user payload to request
            req.user = decoded;

            // 3. Enforce Role-Based Access Control
            if (roleList.length > 0 && !roleList.includes(req.user.role)) {
                return res.status(403).json({ success: false, message: 'Forbidden: You do not have the required role' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Invalid or Expired Token' });
        }
    };
};

const requireAuth = () => authMiddleware([]);
const requireRole = (...roles) => authMiddleware(roles.flat());

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;
module.exports.getJwtSecret = getJwtSecret;


