const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');

const SupabaseSessionStore = require('./config/sessionStore');
const { attachUser } = require('./middleware/authMiddleware');
const csrfProtection = require('./middleware/csrf');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { icon } = require('./utils/icons');

const indexRoutes = require('./routes/index');
const fileRoutes = require('./routes/files');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.locals.icon = icon;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(generalLimiter);

app.use(
  session({
    name: 'filey.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new SupabaseSessionStore(),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(attachUser);
app.use(csrfProtection);

app.use(indexRoutes);
app.use(fileRoutes);
app.use(uploadRoutes);
app.use(authRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
