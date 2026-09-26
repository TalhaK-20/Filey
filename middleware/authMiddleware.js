function attachUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.xhr || req.headers.accept === 'application/json') {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    if (req.xhr || req.headers.accept === 'application/json') {
      return res.status(403).json({ success: false, error: { message: 'Admin access required' } });
    }
    return res.status(403).render('error', {
      title: 'Forbidden',
      statusCode: 403,
      message: 'Admin access required',
    });
  }
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
