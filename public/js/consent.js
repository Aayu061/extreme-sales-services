// public/js/consent.js
// Privacy-consent checkboxes shared by the public customer forms
// (service booking, AMC request, contact enquiry, product enquiry).
// Markup per form: input[data-consent="privacy"], input[data-consent="marketing"]
// and an error element [data-consent-error] linked via aria-describedby.
// The server rejects submissions without consent too; this only gives a clear inline message first.
(function () {
    'use strict';

    var ERROR_TEXT = 'Please tick this box to agree to the Privacy Notice before sending.';

    function parts(form) {
        return {
            privacy: form ? form.querySelector('input[data-consent="privacy"]') : null,
            marketing: form ? form.querySelector('input[data-consent="marketing"]') : null,
            error: form ? form.querySelector('[data-consent-error]') : null
        };
    }

    function setError(p, message) {
        if (p.error) p.error.textContent = message || '';
        if (p.privacy) {
            if (message) p.privacy.setAttribute('aria-invalid', 'true');
            else p.privacy.removeAttribute('aria-invalid');
        }
    }

    /** true when privacy consent is ticked; otherwise shows the inline error, focuses the box and returns false. */
    function check(form) {
        var p = parts(form);
        if (!p.privacy) return true; // no consent box on this form: the server decides
        if (p.privacy.checked) {
            setError(p, '');
            return true;
        }
        setError(p, ERROR_TEXT);
        p.privacy.focus();
        return false;
    }

    /** Fields to add to the JSON payload. */
    function values(form) {
        var p = parts(form);
        return {
            consent_privacy: Boolean(p.privacy && p.privacy.checked),
            consent_marketing: Boolean(p.marketing && p.marketing.checked)
        };
    }

    /** Show a server-side consent rejection next to the box. */
    function showServerError(form, message) {
        var p = parts(form);
        setError(p, message || ERROR_TEXT);
        if (p.privacy) p.privacy.focus();
    }

    function bind(form) {
        var p = parts(form);
        if (!p.privacy || form.__essConsentBound) return;
        form.__essConsentBound = true;
        p.privacy.addEventListener('change', function () {
            if (p.privacy.checked) setError(p, '');
        });
        form.addEventListener('reset', function () { setError(p, ''); });
    }

    function bindAll() {
        var forms = document.querySelectorAll('form');
        for (var i = 0; i < forms.length; i++) bind(forms[i]);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindAll);
    else bindAll();

    window.EssConsent = { check: check, values: values, showServerError: showServerError };
})();
