/**
 * Small inline-SVG icon set, rendered server-side so no icon font/library or extra
 * request is needed. Registered as `icon()` on app.locals (see app.js) so any EJS
 * view can call it directly: `<%- icon('download') %>`.
 *
 * Every glyph shares the same 24x24 grid, ~1.7 stroke weight, and rounded caps/joins
 * so the set reads as one consistent family at icon-button size, not a mix of
 * mismatched styles.
 */
const ICONS = {
  download:
    '<path d="M12 3.5v11.5" stroke-linecap="round" /><path d="M7.75 11.25L12 15.5l4.25-4.25" stroke-linecap="round" stroke-linejoin="round" /><path d="M4.75 17v1.75A2.25 2.25 0 007 21h10a2.25 2.25 0 002.25-2.25V17" stroke-linecap="round" stroke-linejoin="round" />',
  // "Share" here means copy-link, so the glyph is a link/chain — clearer at a
  // glance than a generic multi-node share icon, and matches the actual action.
  share:
    '<path d="M9.5 14.5l5-5" stroke-linecap="round" /><path d="M11.1 6.4l1.5-1.5a3.3 3.3 0 014.6 4.6l-1.5 1.5" stroke-linecap="round" stroke-linejoin="round" /><path d="M12.9 17.6l-1.5 1.5a3.3 3.3 0 01-4.6-4.6l1.5-1.5" stroke-linecap="round" stroke-linejoin="round" />',
  delete:
    '<path d="M4.5 7.5h15" stroke-linecap="round" /><path d="M9.75 11v5.5M14.25 11v5.5" stroke-linecap="round" /><path d="M6.5 7.5l.85 11.2a2 2 0 002 1.8h5.3a2 2 0 002-1.8l.85-11.2" stroke-linecap="round" stroke-linejoin="round" /><path d="M9.25 7.5V5.25A1.75 1.75 0 0111 3.5h2a1.75 1.75 0 011.75 1.75V7.5" stroke-linecap="round" stroke-linejoin="round" />',
  'arrow-right': '<path d="M5 12h13" stroke-linecap="round" /><path d="M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />',
  close: '<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />',
  warning:
    '<path d="M12 3.5l9.5 16.5H2.5z" stroke-linejoin="round" /><path d="M12 10v4.5" stroke-linecap="round" /><circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />',
};

function icon(name, { size = 18, className = '' } = {}) {
  const body = ICONS[name];
  if (!body) return '';
  const classes = ['icon', `icon-${name}`, className].filter(Boolean).join(' ');
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${body}</svg>`;
}

module.exports = { icon };
