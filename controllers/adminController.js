const File = require('../models/File');
const User = require('../models/User');
const Report = require('../models/Report');
const fileService = require('../services/fileService');
const storageService = require('../services/storageService');
const { AppError } = require('../middleware/errorHandler');

async function dashboard(req, res, next) {
  try {
    const [{ stats }, openReports, userCount, recentFiles] = await Promise.all([
      fileService.getStatsAndCategoryCounts(),
      Report.listOpenWithFile(50),
      User.count(),
      File.listRecentAll(50),
    ]);

    res.render('admin', {
      title: 'Admin — FILEY',
      stats,
      openReports,
      userCount,
      recentFiles,
    });
  } catch (err) {
    next(err);
  }
}

async function removeFile(req, res, next) {
  try {
    const file = await File.updateStatus(req.params.id, 'removed');
    if (!file) return next(new AppError('File not found', 404));
    res.json({ success: true, data: { id: file._id, status: file.status } });
  } catch (err) {
    next(err);
  }
}

async function blockFile(req, res, next) {
  try {
    const file = await File.updateStatus(req.params.id, 'blocked');
    if (!file) return next(new AppError('File not found', 404));
    res.json({ success: true, data: { id: file._id, status: file.status } });
  } catch (err) {
    next(err);
  }
}

async function restoreFile(req, res, next) {
  try {
    const file = await File.updateStatus(req.params.id, 'active');
    if (!file) return next(new AppError('File not found', 404));
    res.json({ success: true, data: { id: file._id, status: file.status } });
  } catch (err) {
    next(err);
  }
}

async function resolveReport(req, res, next) {
  try {
    const { status } = req.body;
    if (!['reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
    }
    const report = await Report.updateStatus(req.params.id, status);
    if (!report) return next(new AppError('Report not found', 404));
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// Site-wide, irreversible: every file for every user, both the database rows and
// the actual bytes in storage. Gated behind requireAdmin at the route level — never
// exposed anywhere a non-admin or anonymous visitor could reach it.
async function deleteAllFiles(req, res, next) {
  try {
    const storageKeys = await File.listAllStorageKeys();

    if (storageKeys.length > 0) {
      await storageService.deleteFiles({ storageKeys });
    }
    await File.deleteAll();

    res.json({ success: true, data: { count: storageKeys.length } });
  } catch (err) {
    next(err);
  }
}

module.exports = { dashboard, removeFile, blockFile, restoreFile, resolveReport, deleteAllFiles };
