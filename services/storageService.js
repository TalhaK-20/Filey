/**
 * Storage abstraction layer.
 *
 * On Vercel (and any serverless platform) the local filesystem is ephemeral and NOT
 * shared across function invocations/instances — files written to /uploads during
 * one request will not reliably exist for a later request. Local disk storage below
 * is for local development only. Set STORAGE_PROVIDER=supabase for any deployment,
 * including Vercel.
 *
 * Every provider implements uploadFile(), getDownloadTarget(), and deleteFile() so
 * the rest of the app never needs to know which one is active.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSupabase } = require('../config/supabase');

const PROVIDER = process.env.STORAGE_PROVIDER || 'local';
const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'filey-uploads';
const SIGNED_URL_TTL_SECONDS = 60;

function generateStorageKey(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const random = crypto.randomBytes(16).toString('hex');
  return `${Date.now()}-${random}${ext}`;
}

// ---------------------------------------------------------------------------
// Local disk provider (development only)
// ---------------------------------------------------------------------------
const localProvider = {
  async uploadFile({ buffer, filePath, storageKey }) {
    if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
      fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
    }
    const destination = path.join(LOCAL_UPLOAD_DIR, storageKey);

    if (buffer) {
      await fs.promises.writeFile(destination, buffer);
    } else if (filePath) {
      await fs.promises.rename(filePath, destination);
    } else {
      throw new Error('uploadFile requires either a buffer or a filePath');
    }

    return { storageKey, storageUrl: `/files-local/${storageKey}` };
  },

  async getDownloadTarget({ storageKey }) {
    const filePath = path.join(LOCAL_UPLOAD_DIR, storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in local storage');
    }
    const stat = await fs.promises.stat(filePath);
    return { type: 'stream', stream: fs.createReadStream(filePath), size: stat.size };
  },

  async deleteFile({ storageKey }) {
    await fs.promises.rm(path.join(LOCAL_UPLOAD_DIR, storageKey), { force: true });
  },

  async deleteFiles({ storageKeys }) {
    await Promise.all(storageKeys.map((key) => fs.promises.rm(path.join(LOCAL_UPLOAD_DIR, key), { force: true })));
  },
};

// ---------------------------------------------------------------------------
// Supabase Storage provider (production / Vercel)
// ---------------------------------------------------------------------------
const supabaseProvider = {
  async uploadFile({ buffer, filePath, storageKey, mimeType }) {
    // Files are already capped by Vercel's request body ceiling (~4.5 MB) before
    // they ever reach this function (see README "Known serverless limitation"), so
    // reading the whole thing into memory here is a non-issue at that size. If a
    // direct-to-Supabase browser upload is added later to bypass that ceiling, this
    // should switch to a streamed upload instead.
    const body = buffer || (await fs.promises.readFile(filePath));

    const { error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(storageKey, body, { contentType: mimeType, upsert: false });
    if (error) throw error;

    if (filePath) {
      await fs.promises.rm(filePath, { force: true });
    }

    return { storageKey, storageUrl: null };
  },

  // Returns a short-lived signed URL rather than streaming bytes through this
  // function — offloads the actual transfer to Supabase's CDN, which sidesteps
  // Vercel's function-duration limit for large/slow downloads entirely.
  async getDownloadTarget({ storageKey, filename }) {
    const { data, error } = await getSupabase()
      .storage.from(BUCKET)
      .createSignedUrl(storageKey, SIGNED_URL_TTL_SECONDS, { download: filename || true });
    if (error) throw error;
    return { type: 'redirect', url: data.signedUrl };
  },

  async deleteFile({ storageKey }) {
    const { error } = await getSupabase().storage.from(BUCKET).remove([storageKey]);
    if (error) throw error;
  },

  // Chunked because the Storage API's remove() call has a practical payload limit —
  // safe for the "delete everything" admin action even with a large bucket.
  async deleteFiles({ storageKeys }) {
    const client = getSupabase();
    const chunkSize = 100;
    for (let i = 0; i < storageKeys.length; i += chunkSize) {
      const chunk = storageKeys.slice(i, i + chunkSize);
      const { error } = await client.storage.from(BUCKET).remove(chunk);
      if (error) throw error;
    }
  },
};

const providers = { local: localProvider, supabase: supabaseProvider };
const activeProvider = providers[PROVIDER];

if (!activeProvider) {
  throw new Error(`Unknown STORAGE_PROVIDER "${PROVIDER}". Use "local" or "supabase".`);
}

module.exports = {
  provider: PROVIDER,
  generateStorageKey,
  uploadFile: activeProvider.uploadFile,
  getDownloadTarget: activeProvider.getDownloadTarget,
  deleteFile: activeProvider.deleteFile,
  deleteFiles: activeProvider.deleteFiles,
};
