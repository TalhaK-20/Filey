const { getSupabase } = require('../config/supabase');
const File = require('../models/File');
const { escapeLike } = require('../utils/sanitize');

const PAGE_SIZE = 20;

const SORT_COLUMNS = {
  newest: { column: 'created_at', ascending: false },
  downloads: { column: 'download_count', ascending: false },
  largest: { column: 'size', ascending: false },
  smallest: { column: 'size', ascending: true },
};

/**
 * Searches active files by filename (case-insensitive substring), extension, and
 * category, with sorting and pagination.
 *
 * Note: "relevance" sort falls back to newest. The original Mongo implementation
 * used a $text index to rank matches; Postgres ILIKE substring matching (used here
 * for its simplicity and because filename search benefits more from exact substring
 * matches than word-stemmed full-text ranking) has no relevance score to sort by.
 * Searching by extension directly still works via the dedicated `extension` filter.
 */
async function searchFiles({ q, extension, category, sort = 'newest', page = 1 }) {
  const query = (q || '').trim();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const orderSpec = SORT_COLUMNS[sort] || SORT_COLUMNS.newest;

  let builder = getSupabase()
    .from('files')
    .select('*, uploader:users(id, username)', { count: 'exact' })
    .eq('status', 'active');

  if (query) {
    builder = builder.ilike('original_name', `%${escapeLike(query)}%`);
  }
  if (extension) {
    builder = builder.eq('extension', extension.replace(/^\./, '').toLowerCase());
  }
  if (category && File.CATEGORIES.includes(category)) {
    builder = builder.eq('category', category);
  }

  const { data, error, count } = await builder
    .order(orderSpec.column, { ascending: orderSpec.ascending })
    .range(from, to);
  if (error) throw error;

  const total = count || 0;

  return {
    results: data.map(File.fromRow),
    total,
    page: pageNum,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pageSize: PAGE_SIZE,
  };
}

module.exports = { searchFiles, PAGE_SIZE };
