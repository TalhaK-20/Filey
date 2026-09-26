const { getSupabase } = require('../config/supabase');

const REASONS = ['copyright', 'malware', 'illegal-content', 'spam', 'other'];
const STATUSES = ['open', 'reviewed', 'dismissed'];

function mapReport(row) {
  if (!row) return null;
  return {
    _id: row.id,
    file: row.file
      ? { _id: row.file.id, originalName: row.file.original_name, status: row.file.status }
      : row.file_id,
    reason: row.reason,
    description: row.description,
    reporterIp: row.reporter_ip,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function create({ file, reason, description, reporterIp }) {
  const { data, error } = await getSupabase()
    .from('reports')
    .insert({ file_id: file, reason, description: description || '', reporter_ip: reporterIp })
    .select()
    .single();
  if (error) throw error;
  return mapReport(data);
}

async function listOpenWithFile(limit = 50) {
  const { data, error } = await getSupabase()
    .from('reports')
    .select('*, file:files(id, original_name, status)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(mapReport);
}

async function updateStatus(id, status) {
  const { data, error } = await getSupabase()
    .from('reports')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return mapReport(data);
}

module.exports = { REASONS, STATUSES, create, listOpenWithFile, updateStatus };
