const crypto = require('crypto');

/**
 * Minimal session-bound CSRF protection (the csurf package is deprecated).
 * A token is generated once per session and exposed to views as csrfToken.
 * State-changing requests (POST/PUT/PATCH/DELETE) must echo it back via a
 * hidden form field or X-CSRF-Token header.
 */
function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isApiJson = req.path.startsWith('/api/');

  if (mutating && !isApiJson) {
    const submitted = (req.body && req.body._csrf) || req.headers['x-csrf-token'];
    if (!submitted || submitted !== req.session.csrfToken) {
      return res.status(403).render('error', {
        title: 'Forbidden',
        statusCode: 403,
        message: 'Invalid or missing security token. Please refresh the page and try again.',
      });
    }
  }

  next();
}

module.exports = csrfProtection;
