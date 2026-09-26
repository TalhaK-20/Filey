const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { singleFileUpload, verifyFileContent } = require('../middleware/uploadMiddleware');

// No account required to upload — anonymous uploads are stored with uploader_id
// null and uploaderName "Anonymous" (already supported by the File model/schema).
// Abuse control for anonymous uploads falls back to uploadLimiter's per-IP limit
// and the existing report/admin-block flow, rather than a per-account history.
router.get('/upload', uploadController.showUploadForm);
router.post('/upload', uploadLimiter, singleFileUpload, verifyFileContent, uploadController.handleUpload);

module.exports = router;
