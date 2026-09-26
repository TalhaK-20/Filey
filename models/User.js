const { getSupabase } = require('../config/supabase');

function mapUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function findByEmail(email) {
  const { data, error } = await getSupabase().from('users').select('*').eq('email', email).maybeSingle();
  if (error) throw error;
  return mapUser(data);
}

async function findById(id) {
  const { data, error } = await getSupabase().from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return mapUser(data);
}

// Two separate lookups instead of a single `.or()` filter — keeps user-supplied
// email/username out of any hand-built PostgREST filter string entirely.
async function findByEmailOrUsername(email, username) {
  const client = getSupabase();
  const [byEmail, byUsername] = await Promise.all([
    client.from('users').select('*').eq('email', email).maybeSingle(),
    client.from('users').select('*').eq('username', username).maybeSingle(),
  ]);
  if (byEmail.error) throw byEmail.error;
  if (byUsername.error) throw byUsername.error;
  return mapUser(byEmail.data || byUsername.data);
}

async function create({ username, email, passwordHash }) {
  const { data, error } = await getSupabase()
    .from('users')
    .insert({ username, email, password_hash: passwordHash })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      const dup = new Error('That username or email is already registered.');
      dup.code = 11000;
      throw dup;
    }
    throw error;
  }
  return mapUser(data);
}

async function count() {
  const { count: total, error } = await getSupabase()
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return total || 0;
}

async function setRoleByEmail(email, role) {
  const { data, error } = await getSupabase()
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('email', email)
    .select()
    .maybeSingle();
  if (error) throw error;
  return mapUser(data);
}

module.exports = { findByEmail, findById, findByEmailOrUsername, create, count, setRoleByEmail };
