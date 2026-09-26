const { getSupabase } = require('../config/supabase');

const CATEGORIES = ['Documents', 'Images', 'Audio', 'Video', 'Archives', 'Software', 'Other'];
const STATUSES = ['active', 'pending', 'removed', 'blocked'];

const SELECT_WITH_UPLOADER = '*, uploader:users(id, username)';

function mapFile(row) {
  if (!row) return null;
  return {
    _id: row.id,
    originalName: row.original_name,
    storedName: row.stored_name,
    storageKey: row.storage_key,
    storageUrl: row.storage_url,
    storageProvider: row.storage_provider,
    mimeType: row.mime_type,
    extension: row.extension,
    category: row.category,
    size: Number(row.size),
    checksum: row.checksum,
    description: row.description,
    uploader: row.uploader ? { _id: row.uploader.id, username: row.uploader.username } : null,
    uploaderName: row.uploader_name,
    downloadCount: row.download_count,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function findById(id, { withUploader = false } = {}) {
  const { data, error } = await getSupabase()
    .from('files')
    .select(withUploader ? SELECT_WITH_UPLOADER : '*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return mapFile(data);
}

async function findActiveByChecksum(checksum) {
  const { data, error } = await getSupabase()
    .from('files')
    .select('*')
    .eq('checksum', checksum)
    .neq('status', 'removed')
    .maybeSingle();
  if (error) throw error;
  return mapFile(data);
}

async function create(fields) {
  const { data, error } = await getSupabase()
    .from('files')
    .insert({
      original_name: fields.originalName,
      stored_name: fields.storedName,
      storage_key: fields.storageKey,
      storage_url: fields.storageUrl,
      storage_provider: fields.storageProvider,
      mime_type: fields.mimeType,
      extension: fields.extension,
      category: fields.category,
      size: fields.size,
      checksum: fields.checksum,
      description: fields.description || '',
      uploader_id: fields.uploaderId || null,
      uploader_name: fields.uploaderName || 'Anonymous',
      status: fields.status || 'active',
    })
    .select()
    .single();
  if (error) throw error;
  return mapFile(data);
}

async function updateStatus(id, status) {
  const { data, error } = await getSupabase()
    .from('files')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return mapFile(data);
}

// Only applies the update if the file's current status still matches `currentStatus` —
// used for the report flow so a report can't silently "unblock" a file an admin has
// already reviewed and blocked in the meantime.
async function setStatusIfCurrently(id, newStatus, currentStatus) {
  const { data, error } = await getSupabase()
    .from('files')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', currentStatus)
    .select()
    .maybeSingle();
  if (error) throw error;
  return mapFile(data);
}

// Uses a Postgres function (see supabase/schema.sql) so the increment is atomic under
// concurrent downloads, matching Mongo's $inc behavior.
async function incrementDownloadCount(id) {
  const { error } = await getSupabase().rpc('increment_download_count', { file_id: id });
  if (error) throw error;
}

async function listRecentActive(limit) {
  const { data, error } = await getSupabase()
    .from('files')
    .select(SELECT_WITH_UPLOADER)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(mapFile);
}

async function listByUploaderExcludingRemoved(uploaderId) {
  const { data, error } = await getSupabase()
    .from('files')
    .select('*')
    .eq('uploader_id', uploaderId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapFile);
}

async function listRecentAll(limit) {
  const { data, error } = await getSupabase()
    .from('files')
    .select(SELECT_WITH_UPLOADER)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(mapFile);
}

async function listAllStorageKeys() {
  const { data, error } = await getSupabase().from('files').select('storage_key');
  if (error) throw error;
  return data.map((row) => row.storage_key);
}

// `.not('id', 'is', null)` matches every row (id is never null) — PostgREST refuses
// a delete with no filter at all, so this is the standard "delete everything" idiom.
async function deleteAll() {
  const { error } = await getSupabase().from('files').delete().not('id', 'is', null);
  if (error) throw error;
}

// Computed client-side over the (small, hobby-scale) set of active files rather than
// a SQL aggregate — avoids a second Postgres function just for a homepage stat block.
async function getGlobalStatsAndCategoryCounts() {
  const { data, error } = await getSupabase()
    .from('files')
    .select('size, download_count, category')
    .eq('status', 'active');
  if (error) throw error;

  const stats = { totalFiles: data.length, totalDownloads: 0, totalSize: 0 };
  const categoryCounts = {};
  for (const row of data) {
    stats.totalDownloads += row.download_count;
    stats.totalSize += Number(row.size);
    categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
  }
  return { stats, categoryCounts };
}

module.exports = {
  CATEGORIES,
  STATUSES,
  fromRow: mapFile,
  findById,
  findActiveByChecksum,
  create,
  updateStatus,
  setStatusIfCurrently,
  incrementDownloadCount,
  listRecentActive,
  listByUploaderExcludingRemoved,
  listRecentAll,
  listAllStorageKeys,
  deleteAll,
  getGlobalStatsAndCategoryCounts,
};
