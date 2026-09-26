class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isAppError = true;
  }
}

function notFoundHandler(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: { message: 'Not found' } });
  }
  res.status(404).render('404', { title: 'Not Found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  if (err.code === '23505' || err.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  } else if (err.code === '22P02') {
    // Postgres "invalid input syntax" — e.g. a malformed UUID in a route param.
    statusCode = 400;
    message = 'Invalid identifier';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File exceeds the maximum allowed size';
  } else if (err.name === 'MulterError') {
    // Any other multer failure (unexpected field, too many files, etc.) — still a
    // client error, never a reason to fall through to a generic 500.
    statusCode = 400;
  } else if (err.code === 'DUPLICATE_FILE') {
    statusCode = 409;
  }

  if (!isProd && statusCode === 500) {
    console.error(err);
  } else if (statusCode === 500) {
    console.error('Unexpected error:', err.message);
  }

  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept === 'application/json') {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        ...(isProd ? {} : { stack: err.stack }),
      },
    });
  }

  res.status(statusCode).render('error', {
    title: 'Error',
    statusCode,
    message,
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
