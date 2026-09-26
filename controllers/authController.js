const bcrypt = require('bcryptjs');
const User = require('../models/User');
const File = require('../models/File');
const { AppError } = require('../middleware/errorHandler');

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showRegister(req, res) {
  res.render('register', { title: 'Register', error: null, formValues: {} });
}

async function register(req, res, next) {
  try {
    const { username, email, password, confirmPassword } = req.body;

    const errors = [];
    if (!USERNAME_RE.test(username || '')) {
      errors.push('Username must be 3-30 characters (letters, numbers, _ or -).');
    }
    if (!EMAIL_RE.test(email || '')) {
      errors.push('Please provide a valid email address.');
    }
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters.');
    }
    if (password !== confirmPassword) {
      errors.push('Passwords do not match.');
    }

    if (errors.length) {
      return res.status(400).render('register', {
        title: 'Register',
        error: errors.join(' '),
        formValues: { username, email },
      });
    }

    const existing = await User.findByEmailOrUsername(email.toLowerCase(), username);
    if (existing) {
      return res.status(409).render('register', {
        title: 'Register',
        error: 'That username or email is already registered.',
        formValues: { username, email },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email: email.toLowerCase(), passwordHash });

    req.session.user = { id: user._id, username: user.username, role: user.role };
    res.redirect('/');
  } catch (err) {
    next(err);
  }
}

function showLogin(req, res) {
  res.render('login', { title: 'Login', error: null, formValues: {} });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail((email || '').toLowerCase());

    const valid = user && (await bcrypt.compare(password || '', user.passwordHash));
    if (!valid) {
      return res.status(401).render('login', {
        title: 'Login',
        error: 'Invalid email or password.',
        formValues: { email },
      });
    }

    req.session.user = { id: user._id, username: user.username, role: user.role };
    const returnTo = req.session.returnTo;
    delete req.session.returnTo;
    res.redirect(returnTo || '/');
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('filey.sid');
    res.redirect('/');
  });
}

async function profile(req, res, next) {
  try {
    const files = await File.listByUploaderExcludingRemoved(req.session.user.id);

    const stats = files.reduce(
      (acc, file) => {
        acc.totalDownloads += file.downloadCount;
        acc.totalSize += file.size;
        return acc;
      },
      { totalDownloads: 0, totalSize: 0 }
    );

    res.render('profile', { title: 'Profile', files, stats });
  } catch (err) {
    next(err);
  }
}

module.exports = { showRegister, register, showLogin, login, logout, profile };
