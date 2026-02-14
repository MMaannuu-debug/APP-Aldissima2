// ================================
// SHARED UTILITIES
// ================================

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Use this on any user-provided string before inserting into innerHTML templates.
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
