/**
 * public/js/config.js - Centralized Client Configuration
 * Auto-detects local vs production environment, manages API endpoints,
 * and pre-warms the cloud backend to eliminate cold-start delays.
 */
(function() {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.protocol === 'file:';

    const defaultRemote = 'https://extreme-sales-services-gh7s.onrender.com';

    window.APP_CONFIG = {
        BACKEND_URL: isLocal ? 'http://localhost:5000' : defaultRemote,
        IS_LOCAL: isLocal
    };

    // Auto-prewarm cloud backend silently in the background
    if (!isLocal && typeof fetch === 'function') {
        try {
            fetch(`${defaultRemote}/api/health`, { mode: 'cors', cache: 'no-store' })
                .catch(() => {});
        } catch(e) {}
    }
})();
