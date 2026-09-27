const File = require('../models/File');
const Report = require('../models/Report');
const storageService = require('../services/storageService');
const fileService = require('../services/fileService');
const searchService = require('../services/searchService');
const { AppError } = require('../middleware/errorHandler');

async function home(req, res, next) {
  try {
    const [recent, { stats, categoryCounts }] = await Promise.all([
      File.listRecentActive(8),
      fileService.getStatsAndCategoryCounts(),
    ]);

    res.render('index', {
      title: 'FILEY — Simple. Fast. Share.',
      recent,
      stats,
      categories: File.CATEGORIES,
      categoryCounts,
    });
  } catch (err) {
    next(err);
  }
}

async function searchPage(req, res, next) {
  try {
    const { q = '', extension = '', category = '', sort = 'newest', page = 1 } = req.query;
    const results = await searchService.searchFiles({ q, extension, category, sort, page });

    if (req.xhr || req.headers.accept === 'application/json') {
      return res.json({ success: true, data: results });
    }

    res.render('search', {
      title: q ? `Search: ${q} — FILEY` : 'Search — FILEY',
      query: { q, extension, category, sort, page: results.page },
      categories: File.CATEGORIES,
      ...results,
    });
  } catch (err) {
    next(err);
  }
}

async function fileDetails(req, res, next) {
  try {
    const file = await File.findById(req.params.id, { withUploader: true });
    if (!file || file.status === 'removed') {
      return res.status(404).render('404', { title: 'File Not Found' });
    }
    if (file.status === 'blocked') {
      return res.status(403).render('error', {
        title: 'Unavailable',
        statusCode: 403,
        message: 'This file has been blocked and is no longer available.',
      });
    }
    res.render('file-details', {
      title: `${file.originalName} — FILEY`,
      description: `${file.category} file shared on FILEY — download it instantly, no account needed.`,
      file,
    });
  } catch (err) {
    next(err);
  }
}

async function downloadFile(req, res, next) {
  try {
    const file = await File.findById(req.params.id);
    if (!file || file.status === 'removed' || file.status === 'blocked') {
      return next(new AppError('File not found', 404));
    }

    const target = await storageService.getDownloadTarget({
      storageKey: file.storageKey,
      filename: file.originalName,
    });

    fileService.incrementDownloadCount(file._id).catch((err) => {
      console.error('Failed to increment download count:', err.message);
    });

    if (target.type === 'redirect') {
      return res.redirect(302, target.url);
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', target.size ?? file.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.originalName)}"`
    );

    target.stream.on('error', (err) => next(err));
    target.stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

const REPORT_REASONS = ['copyright', 'malware', 'illegal-content', 'spam', 'other'];

async function reportFile(req, res, next) {
  try {
    const { reason, description } = req.body;
    const file = await File.findById(req.params.id);
    if (!file) return next(new AppError('File not found', 404));

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid report reason' } });
    }

    await Report.create({
      file: file._id,
      reason,
      description: (description || '').slice(0, 2000),
      reporterIp: req.ip,
    });

    await File.setStatusIfCurrently(file._id, 'pending', 'active');

    res.json({ success: true, data: { message: 'Thank you — this file has been reported for review.' } });
  } catch (err) {
    next(err);
  }
}

async function deleteOwnFile(req, res, next) {
  try {
    const file = await File.findById(req.params.id, { withUploader: true });
    if (!file || file.status === 'removed') {
      return next(new AppError('File not found', 404));
    }
    if (!file.uploader || file.uploader._id !== req.session.user.id) {
      return next(new AppError('You can only delete your own files', 403));
    }

    // Hide it first — that's the part that must not fail silently. Cleaning up the
    // actual bytes in storage is treated as best-effort after that (like the
    // download-count increment above): if it errors, the file is already gone from
    // the uploader's view either way, so there's nothing useful to show them.
    await File.updateStatus(file._id, 'removed');

    storageService.deleteFile({ storageKey: file.storageKey }).catch((err) => {
      console.error('Failed to delete storage object for file', file._id, ':', err.message);
    });

    res.json({ success: true, data: { id: file._id } });
  } catch (err) {
    next(err);
  }
}

module.exports = { home, searchPage, fileDetails, downloadFile, reportFile, deleteOwnFile };
