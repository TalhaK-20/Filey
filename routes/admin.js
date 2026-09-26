const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth, requireAdmin);

router.get('/', adminController.dashboard);
router.post('/files/:id/remove', adminController.removeFile);
router.post('/files/:id/block', adminController.blockFile);
router.post('/files/:id/restore', adminController.restoreFile);
router.post('/reports/:id/resolve', adminController.resolveReport);
router.post('/files/delete-all', adminController.deleteAllFiles);

module.exports = router;
