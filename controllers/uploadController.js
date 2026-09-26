const fs = require('fs');
const File = require('../models/File');
const User = require('../models/User');
const fileService = require('../services/fileService');
const { MAX_UPLOAD_BYTES } = require('../middleware/uploadMiddleware');

function showUploadForm(req, res) {
  res.render('upload', { title: 'Share a File — FILEY', categories: File.CATEGORIES, maxUploadBytes: MAX_UPLOAD_BYTES });
}

async function handleUpload(req, res, next) {
  try {
    const uploader = req.session.user ? await User.findById(req.session.user.id) : null;

    const fileDoc = await fileService.createFileFromUpload({
      file: req.file,
      description: req.body.description,
      category: req.body.category,
      uploader,
    });

    res.status(201).json({
      success: true,
      data: {
        id: fileDoc._id,
        originalName: fileDoc.originalName,
        category: fileDoc.category,
        size: fileDoc.size,
        url: `/files/${fileDoc._id}`,
      },
    });
  } catch (err) {
    if (req.file && req.file.path) {
      await fs.promises.rm(req.file.path, { force: true }).catch(() => {});
    }
    if (err.code === 'DUPLICATE_FILE') {
      return res.status(409).json({
        success: false,
        error: { message: err.message, existingFileId: err.existingFileId },
      });
    }
    next(err);
  }
}

module.exports = { showUploadForm, handleUpload };
