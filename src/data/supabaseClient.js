import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at startup rather than producing confusing "fetch failed"
  // errors deep inside a login attempt.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check .env.local (local dev) or the Vercel project\'s environment variables (production).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
