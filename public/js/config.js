/**
 * public/js/config.js - Centralized Client Configuration
 * Auto-detects local vs production environment and manages API endpoints.
 * In production on Vercel, requests use relative '/api' which transparently proxies
 * to Render via Vercel's edge rewrite rules. In local development, requests target http://localhost:5000.
 */
(function() {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.protocol === 'file:';

    // In local development, point to local Express server.
    // In production, use empty string '' so `${BACKEND_URL}/api/...` resolves to relative `/api/...` via Vercel edge rewrite.
    const backendUrl = isLocal ? 'http://localhost:5000' : '';
    const apiBase = isLocal ? 'http://localhost:5000/api' : '/api';

    // Global XSS Sanitization Utility (Phase 4)
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.APP_CONFIG = {
        BACKEND_URL: backendUrl,
        API_BASE: apiBase,
        IS_LOCAL: isLocal,
        escapeHtml: escapeHtml
    };

    window.escapeHtml = escapeHtml;

    // Auto-prewarm cloud backend via Vercel proxy
    if (!isLocal && typeof fetch === 'function') {
        try {
            fetch('/api/health', { cache: 'no-store' }).catch(() => {});
        } catch(e) {}
    }
})();
