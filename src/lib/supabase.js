import { createClient } from '@supabase/supabase-js';

const envSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const envSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const envServiceRoleKey = (import.meta.env.VITE_SERVICE_ROLE_API_KEY || '').trim();

if (envServiceRoleKey) {
  throw new Error(
    'VITE_SERVICE_ROLE_API_KEY must not be exposed to the frontend. Remove it from browser env vars.'
  );
}

const supabaseUrl = envSupabaseUrl || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = envSupabaseAnonKey || FALLBACK_SUPABASE_ANON_KEY;

if (!envSupabaseUrl || !envSupabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Using bundled fallback credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
