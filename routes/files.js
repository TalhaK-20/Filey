const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { requireAuth } = require('../middleware/authMiddleware');
const { reportLimiter } = require('../middleware/rateLimiter');

router.get('/search', fileController.searchPage);
router.get('/files/:id', fileController.fileDetails);
router.get('/files/:id/download', fileController.downloadFile);
router.post('/files/:id/report', reportLimiter, fileController.reportFile);
router.post('/files/:id/delete', requireAuth, fileController.deleteOwnFile);

module.exports = router;
