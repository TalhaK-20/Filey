const express = require('express');
const router = express.Router();
const File = require('../models/File');
const uploadController = require('../controllers/uploadController');
const adminController = require('../controllers/adminController');
const searchService = require('../services/searchService');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { singleFileUpload, verifyFileContent } = require('../middleware/uploadMiddleware');
const { AppError } = require('../middleware/errorHandler');

router.get('/files', async (req, res, next) => {
  try {
    const { q = '', extension = '', category = '', sort = 'newest', page = 1 } = req.query;
    const data = await searchService.searchFiles({ q, extension, category, sort, page });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/files/:id', async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id, { withUploader: true });
    if (!file || file.status === 'removed') {
      return next(new AppError('File not found', 404));
    }
    res.json({ success: true, data: file });
  } catch (err) {
    next(err);
  }
});

router.post('/files', uploadLimiter, singleFileUpload, verifyFileContent, uploadController.handleUpload);

router.delete('/files/:id', requireAuth, requireAdmin, adminController.removeFile);

module.exports = router;
