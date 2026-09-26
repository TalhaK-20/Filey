const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.get('/register', authController.showRegister);
router.post('/register', authLimiter, authController.register);

router.get('/login', authController.showLogin);
router.post('/login', authLimiter, authController.login);

router.post('/logout', authController.logout);

router.get('/profile', requireAuth, authController.profile);

module.exports = router;
