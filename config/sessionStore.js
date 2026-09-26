const session = require('express-session');
const { getSupabase } = require('./supabase');

/**
 * express-session store backed by a Supabase Postgres table, accessed over the same
 * stateless PostgREST HTTP client as everything else — avoids holding a direct
 * Postgres connection open per serverless invocation (a common source of connection-
 * pool exhaustion on Postgres-backed serverless apps).
 */
class SupabaseSessionStore extends session.Store {
  async get(sid, callback) {
    try {
      const { data, error } = await getSupabase()
        .from('sessions')
        .select('sess, expire')
        .eq('sid', sid)
        .maybeSingle();
      if (error) throw error;
      if (!data || new Date(data.expire) < new Date()) return callback(null, null);
      callback(null, data.sess);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      const maxAge = sessionData.cookie?.maxAge ?? 24 * 60 * 60 * 1000;
      const expire = new Date(Date.now() + maxAge).toISOString();
      const { error } = await getSupabase()
        .from('sessions')
        .upsert({ sid, sess: sessionData, expire }, { onConflict: 'sid' });
      if (error) throw error;
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      const { error } = await getSupabase().from('sessions').delete().eq('sid', sid);
      if (error) throw error;
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  touch(sid, sessionData, callback) {
    return this.set(sid, sessionData, callback || (() => {}));
  }
}

module.exports = SupabaseSessionStore;
