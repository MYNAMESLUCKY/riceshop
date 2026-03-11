import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  });
  if (authErr) { console.error('Login failed', authErr.message); return; }
  
  const userId = authData.user.id;
  console.log('Logged in:', userId);
  
  const updates = { id: userId, full_name: 'Bob Builder ' + Date.now(), role: 'user' };
  const { data, error } = await supabase.from('profiles').upsert(updates).select().single();
  console.log('Upsert:', error || data);
}
test();
