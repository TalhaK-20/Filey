const path = require('path');

/**
 * Strips path components and dangerous characters from a user-supplied filename.
 * Prevents path traversal (../, ..\, absolute paths) and control/script characters.
 */
function sanitizeFilename(originalName) {
  const base = path.basename(String(originalName || 'file'));

  let cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/^\.+/, '')
    .trim();

  if (!cleaned) cleaned = 'file';

  if (cleaned.length > 200) {
    const ext = path.extname(cleaned).slice(0, 20);
    cleaned = cleaned.slice(0, 200 - ext.length) + ext;
  }

  return cleaned;
}

function getSafeExtension(filename) {
  const ext = path.extname(filename).replace(/^\./, '').toLowerCase();
  return /^[a-z0-9]{0,10}$/.test(ext) ? ext : '';
}

// Executable/script extensions blocked outright — these are common malware vectors
// and add no legitimate value to a document/media sharing app. Everything else is
// allowed since downloads are always forced (Content-Disposition: attachment) and
// uploads are never placed anywhere the server would execute them.
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'ps1', 'vbs', 'wsf', 'dll', 'jar', 'app',
]);

function isBlockedExtension(extension) {
  return BLOCKED_EXTENSIONS.has(String(extension || '').toLowerCase());
}

// Escapes Postgres ILIKE pattern characters (%, _) and the escape character itself
// so user-supplied search text is matched literally before being wrapped in %...%.
function escapeLike(str) {
  return String(str).replace(/[%_\\]/g, '\\$&');
}

module.exports = { sanitizeFilename, getSafeExtension, isBlockedExtension, escapeLike };
