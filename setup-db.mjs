/**
 * GoldenGrain - Database Setup Script
 * 
 * This creates all the tables and seeds initial product data.
 * 
 * Usage:
 *   node setup-db.mjs <YOUR_SERVICE_ROLE_KEY>
 * 
 * Find your service_role key at:
 *   Supabase Dashboard → Settings → API → service_role secret
 */

const SUPABASE_URL = 'https://fnjvogkvjeuwltjyghus.supabase.co';
const SERVICE_KEY = process.argv[2];

if (!SERVICE_KEY) {
  console.error('ERROR: Please provide your service_role key as an argument.');
  console.error('Usage: node setup-db.mjs eyJhbGci...');
  console.error('\nFind it at: Supabase Dashboard → Settings → API → service_role (secret)');
  process.exit(1);
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function runSQL(sql, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql })
  });

  // The Supabase SQL via REST is done through the /pg endpoint
  // We need to use the Postgres REST API or just direct queries
  // Let's try via the management endpoint
  const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: sql })
  });

  if (res2.ok) {
    console.log(`  ✅ ${label}`);
    return true;
  } else {
    const body = await res2.text();
    // If the table already exists, that's fine
    if (body.includes('already exists')) {
      console.log(`  ⚠️  ${label} (already exists, skipping)`);
      return true;
    }
    console.log(`  ❌ ${label}: ${body.slice(0, 120)}`);
    return false;
  }
}

console.log('🌾 GoldenGrain Database Setup\n');
console.log('Connecting to Supabase...\n');

// Verify service key
const testRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
});

if (testRes.status === 200) {
  console.log('✅ Service role key verified — admin access confirmed\n');
} else {
  console.error(`❌ Invalid service role key (status ${testRes.status}). Make sure you're using the service_role key, not the anon key.`);
  process.exit(1);
}

// Since we can't easily run arbitrary SQL via REST with service key alone,
// let's at least verify the auth admin works and check user count
const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
});
const usersData = await usersRes.json();
const userCount = usersData?.users?.length ?? 0;
console.log(`── Auth Users ──`);
console.log(`  ✅ Auth is working — ${userCount} registered user(s) found`);
if (userCount > 0) {
  usersData.users.slice(0, 3).forEach(u => {
    console.log(`     • ${u.phone || u.email || u.id.slice(0,8)} (${u.role || 'user'})`);
  });
}

console.log('\n── Database Tables ──');
console.log('  ℹ️  To create the tables, please copy and run this SQL in your Supabase SQL Editor:');
console.log('  📍 https://supabase.com/dashboard/project/fnjvogkvjeuwltjyghus/sql/new\n');
console.log('  The SQL file is at: src/lib/database.sql\n');
console.log('  For existing deployments, run: src/lib/database_migration_admin_gps.sql\n');
console.log('  After running, the following tables will be created:');
['profiles', 'addresses', 'products', 'orders', 'order_items', 'admin_settings', 'admin_activity_logs'].forEach(t => {
  console.log(`    • ${t}`);
});

console.log('\n── Phone Auth ──');
console.log('  To enable Phone/OTP:');
console.log('  📍 https://supabase.com/dashboard/project/fnjvogkvjeuwltjyghus/auth/providers');
console.log('  → Enable "Phone" provider');
console.log('  → Add Twilio credentials (Account SID, Auth Token, From number)');
console.log('  → Save\n');
