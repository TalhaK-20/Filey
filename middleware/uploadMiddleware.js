const os = require('os');
const fs = require('fs');
const multer = require('multer');
const { AppError } = require('./errorHandler');
const { getSafeExtension, isBlockedExtension } = require('../utils/sanitize');

const configuredMaxMB = parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 200;

// Vercel's Node.js Serverless Functions reject any request body over ~4.5 MB at the
// platform level, before this code (or multer) ever runs — no application-level
// setting can raise that ceiling. Clamping our own limit safely below it means that,
// for requests small enough to actually reach us, multer's LIMIT_FILE_SIZE error
// (handled gracefully below and in errorHandler.js) fires instead of the request
// ever depending on Vercel's own less-friendly rejection.
const VERCEL_SAFE_MAX_MB = 4;
const effectiveMaxMB = process.env.VERCEL ? Math.min(configuredMaxMB, VERCEL_SAFE_MAX_MB) : configuredMaxMB;
const MAX_UPLOAD_BYTES = effectiveMaxMB * 1024 * 1024;

// Files are staged to the OS temp dir (writable even on serverless platforms like
// Vercel) and streamed from there into the configured storage provider, rather
// than being buffered fully in process memory.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => {
    cb(null, `filey-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  },
});

function fileFilter(req, file, cb) {
  const extension = getSafeExtension(file.originalname);
  if (isBlockedExtension(extension)) {
    return cb(new AppError(`Files with the .${extension} extension are not allowed`, 400));
  }
  if (!file.originalname || file.originalname.length > 255) {
    return cb(new AppError('Invalid filename', 400));
  }
  cb(null, true);
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

const singleFileUpload = multerUpload.single('file');

/**
 * Verifies the actual file content against its declared MIME type using magic-byte
 * sniffing, since the browser-supplied Content-Type/extension can be spoofed.
 * Falls back to trusting the declared type only for content that has no reliable
 * binary signature (e.g. plain text), which is inherently safe to store/stream.
 */
async function verifyFileContent(req, res, next) {
  if (!req.file) {
    return next(new AppError('No file was uploaded', 400));
  }
  if (req.file.size === 0) {
    await fs.promises.rm(req.file.path, { force: true });
    return next(new AppError('Empty files cannot be uploaded', 400));
  }

  try {
    // file-type is an ESM-only package — loaded via dynamic import from this
    // CommonJS module.
    const { fileTypeFromFile } = await import('file-type');
    const detected = await fileTypeFromFile(req.file.path);

    if (detected) {
      const declaredExt = getSafeExtension(req.file.originalname);
      if (isBlockedExtension(detected.ext)) {
        await fs.promises.rm(req.file.path, { force: true });
        return next(new AppError(`Detected file type .${detected.ext} is not allowed`, 400));
      }
      // Trust the sniffed type over the browser-declared one for storage metadata.
      req.file.mimetype = detected.mime;
      if (!declaredExt) {
        req.file.originalname += `.${detected.ext}`;
      }
    }
    // No signature detected (e.g. text/plain, csv, json) — declared type is kept
    // as-is since these formats are not executable and pose no spoofing risk.
    next();
  } catch (err) {
    // Whatever failed above, the temp file multer staged is never going to be used
    // now — clean it up so a burst of failed uploads can't fill Vercel's shared,
    // size-limited /tmp directory across warm invocations of the same container.
    await fs.promises.rm(req.file.path, { force: true }).catch(() => {});
    next(err);
  }
}

module.exports = { singleFileUpload, verifyFileContent, MAX_UPLOAD_BYTES };
