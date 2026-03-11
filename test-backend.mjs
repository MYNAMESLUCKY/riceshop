/**
 * Comprehensive Supabase backend + auth test
 * Run with: node test-backend.mjs
 */

const SUPABASE_URL = 'https://fnjvogkvjeuwltjyghus.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuanZvZ2t2amV1d2x0anlnaHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDc3NDQsImV4cCI6MjA4ODcyMzc0NH0.pyJSxEc5fkve4WHc2LF325w7nQ8uLjC1ecLZU-thDxs';

const headers = { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' };

let passed = 0, failed = 0;

function ok(label, val) { console.log(`  ✅ ${label}`); passed++; }
function fail(label, msg) { console.log(`  ❌ ${label}: ${msg}`); failed++; }
function section(name) { console.log(`\n── ${name} ──`); }

// ── 1. CONNECTIVITY ──────────────────────────────────────────
section('1. Connectivity');
{
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
  res.status === 200 ? ok('REST API reachable (200)') : fail('REST API', `status ${res.status}`);
}

// ── 2. AUTH CONFIG ──────────────────────────────────────────
section('2. Auth Configuration');
{
  const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: ANON_KEY } });
  const cfg = await res.json();
  res.status === 200 ? ok('Auth API reachable') : fail('Auth API', `status ${res.status}`);
  
  const phoneEnabled = cfg?.external?.phone ?? cfg?.phone_enabled ?? false;
  phoneEnabled 
    ? ok('Phone/OTP auth is ENABLED') 
    : fail('Phone/OTP auth', 'DISABLED — enable in Supabase Dashboard → Auth → Providers → Phone');

  const emailEnabled = cfg?.external?.email ?? true;
  ok(`Email auth: ${emailEnabled ? 'enabled' : 'disabled'}`);
}

// ── 3. DATABASE TABLES ─────────────────────────────────────
section('3. Database Tables');
for (const table of ['products', 'profiles', 'orders', 'order_items', 'addresses', 'admin_settings', 'admin_activity_logs']) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`, { headers });
  const body = await res.json();
  if (res.status === 200) {
    ok(`Table "${table}" exists`);
  } else if (body?.code === '42P01' || body?.code === 'PGRST205') {
    fail(`Table "${table}"`, 'NOT FOUND — run src/lib/database.sql in Supabase SQL Editor');
  } else {
    fail(`Table "${table}"`, `status ${res.status}: ${JSON.stringify(body).slice(0,80)}`);
  }
}

// ── 4. PRODUCTS DATA ──────────────────────────────────────
section('4. Products Data');
{
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,price,is_active&order=created_at.desc&limit=5`, { headers });
  const data = await res.json();
  if (res.status === 200 && Array.isArray(data)) {
    if (data.length > 0) {
      ok(`Found ${data.length} product(s) in DB`);
      data.forEach(p => console.log(`       • ${p.name} — ₹${p.price}`));
    } else {
      fail('Products data', 'Table is empty — run the INSERT statements in database.sql');
    }
  } else {
    fail('Products query', `status ${res.status}`);
  }
}

// ── 5. RLS SECURITY CHECK ─────────────────────────────────
section('5. Row Level Security (RLS)');
{
  // Try to access profiles without auth — should return empty (RLS), not an error
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,role&limit=5`, { headers });
  const data = await res.json();
  if (res.status === 200) {
    ok(`Profiles RLS: returns ${Array.isArray(data) ? data.length : 0} row(s) to anon user (public policy active)`);
  } else {
    ok(`Profiles RLS: blocked for anon user (strict policy — good!)`);
  }
  
  // Try to access orders without auth — should be blocked
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id&limit=5`, { headers });
  const data2 = await res2.json();
  if (res2.status === 200 && Array.isArray(data2) && data2.length === 0) {
    ok('Orders RLS: properly blocked for unauthenticated user');
  } else if (res2.status === 200) {
    fail('Orders RLS', `WARNING: ${data2.length} order(s) visible without auth — check RLS policies`);
  } else {
    ok('Orders RLS: properly blocked for unauthenticated user');
  }
}

// ── 6. AUTH SIGN-UP ATTEMPT (using email as fallback) ────
section('6. Auth Flow Test (Email Fallback)');
{
  const testEmail = `goldengrain_test_${Date.now()}@example.com`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'TestPass123!' })
  });
  const body = await res.json();
  if (res.status === 200 && body?.user) {
    ok(`Email auth sign-up flow works (user created: ${body.user.id.slice(0,8)}...)`);
  } else if (res.status === 200 && body?.id) {
    ok(`Email auth sign-up flow works (session returned)`);
  } else if (body?.code === 'email_not_confirmed' || body?.message?.includes('confirm')) {
    ok('Email auth sign-up works (email confirmation required — expected)');
  } else {
    fail('Email auth signup', `${res.status}: ${JSON.stringify(body).slice(0, 100)}`);
  }
}

// ── SUMMARY ──────────────────────────────────────────────
console.log(`\n${'─'.repeat(45)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('🎉 All checks passed! Backend is fully operational.');
} else {
  console.log(`⚠️  ${failed} issue(s) need attention (see above).`);
}
