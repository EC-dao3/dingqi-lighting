// ============================================
// DINGQI - Supabase Client Configuration
// ============================================
// Replace these with your Supabase project credentials:
//   1. Go to https://supabase.com → Create Project
//   2. Settings → API → copy URL and anon/public key
// ============================================

const SUPABASE_URL = 'https://yhfjnvpdaxqoyltsbzhs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G1Axo-PnkO51mJdtFEvH5w_xJBv1TVU';

let _db = null;

function getSupabase() {
  if (_db) return _db;
  if (typeof supabase === 'undefined') {
    console.warn('Supabase SDK not loaded. Include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>');
    return null;
  }
  if (SUPABASE_URL.includes('PASTE_YOUR') || SUPABASE_ANON_KEY.includes('PASTE_YOUR')) {
    console.warn('Supabase is not configured. Replace SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase-client.js with your real project credentials.');
    return null;
  }
  _db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _db;
}

// Edge Functions base URL (for verification code flow)
function getFunctionUrl(name) {
  return SUPABASE_URL + '/functions/v1/' + name;
}
