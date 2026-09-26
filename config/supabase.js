const { createClient } = require('@supabase/supabase-js');

let client = null;

/**
 * Lazily creates a single cached Supabase client for the process. supabase-js talks
 * to Postgres over HTTP (PostgREST) rather than holding a persistent connection, so
 * there's no connect/disconnect lifecycle to manage across serverless invocations —
 * just reuse the same client on warm containers.
 */
function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Copy .env.example to .env and configure them.'
    );
  }

  // The service_role key is used because this app is the only caller (all access is
  // server-side, never exposed to the browser) — it bypasses Row Level Security so
  // every query below runs with full read/write access by design.
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

module.exports = { getSupabase };
