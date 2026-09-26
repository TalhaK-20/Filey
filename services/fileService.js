const crypto = require('crypto');
const fs = require('fs');
const File = require('../models/File');
const storageService = require('./storageService');
const { categoryFromMime } = require('../utils/categorize');
const { sanitizeFilename, getSafeExtension } = require('../utils/sanitize');

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function hashFilePath(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Persists an uploaded file (already validated by uploadMiddleware) to storage
 * and creates its metadata record. Accepts either an in-memory buffer or a
 * temp-disk filePath depending on how multer staged it.
 */
async function createFileFromUpload({ file, description, category, uploader }) {
  const safeName = sanitizeFilename(file.originalname);
  const extension = getSafeExtension(safeName) || 'bin';
  const storageKey = storageService.generateStorageKey(safeName);

  const checksum = file.buffer ? hashBuffer(file.buffer) : await hashFilePath(file.path);

  const duplicate = await File.findActiveByChecksum(checksum);
  if (duplicate) {
    // Clean up the just-uploaded temp/buffer copy since we won't store it again.
    if (file.path) {
      await fs.promises.rm(file.path, { force: true });
    }
    const error = new Error('An identical file has already been uploaded.');
    error.code = 'DUPLICATE_FILE';
    error.existingFileId = duplicate._id;
    throw error;
  }

  const { storageUrl } = await storageService.uploadFile({
    buffer: file.buffer,
    filePath: file.path,
    storageKey,
    mimeType: file.mimetype,
  });

  const resolvedCategory = File.CATEGORIES.includes(category)
    ? category
    : categoryFromMime(file.mimetype, extension);

  return File.create({
    originalName: safeName,
    storedName: storageKey,
    storageKey,
    storageUrl,
    storageProvider: storageService.provider,
    mimeType: file.mimetype,
    extension,
    category: resolvedCategory,
    size: file.size,
    checksum,
    description: (description || '').slice(0, 2000),
    uploaderId: uploader ? uploader._id : null,
    uploaderName: uploader ? uploader.username : 'Anonymous',
    status: 'active',
  });
}

async function incrementDownloadCount(fileId) {
  await File.incrementDownloadCount(fileId);
}

async function getStatsAndCategoryCounts() {
  return File.getGlobalStatsAndCategoryCounts();
}

module.exports = { createFileFromUpload, incrementDownloadCount, getStatsAndCategoryCounts };
