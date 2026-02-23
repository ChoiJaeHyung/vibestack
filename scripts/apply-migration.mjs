import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(url, key, {
  db: { schema: 'public' },
});

// Read SQL migration file
const sql = readFileSync('supabase/migrations/003_admin_system.sql', 'utf8');

// Split into blocks. We need to handle $$ delimited functions carefully
const blocks = [];
let current = '';
let inDollarQuote = false;

for (let i = 0; i < sql.length; i++) {
  const char = sql[i];

  if (sql.slice(i, i + 2) === '$$') {
    inDollarQuote = !inDollarQuote;
    current += '$$';
    i++; // skip second $
    continue;
  }

  if (char === ';' && !inDollarQuote) {
    const trimmed = current.replace(/--[^\n]*/g, '').trim();
    if (trimmed.length > 0) {
      blocks.push(trimmed);
    }
    current = '';
    continue;
  }

  current += char;
}

// Handle last block
const lastTrimmed = current.replace(/--[^\n]*/g, '').trim();
if (lastTrimmed.length > 0) {
  blocks.push(lastTrimmed);
}

console.log(`Parsed ${blocks.length} SQL blocks`);

let success = 0;
let failed = 0;

for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i];
  const preview = block.replace(/\s+/g, ' ').slice(0, 80);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: block + ';' });

    if (error) {
      // Try direct SQL via postgrest
      console.log(`  [${i+1}] SKIP (no exec_sql): ${preview}...`);
      failed++;
    } else {
      console.log(`  [${i+1}] OK: ${preview}...`);
      success++;
    }
  } catch(e) {
    console.log(`  [${i+1}] ERROR: ${e.message}`);
    failed++;
  }
}

console.log(`\nResults: ${success} succeeded, ${failed} failed`);

if (failed > 0) {
  console.log('\nSome statements failed. This is expected without a direct SQL connection.');
  console.log('Please execute the migration via Supabase Dashboard SQL Editor:');
  console.log('  URL: https://supabase.com/dashboard/project/zfawwcbrxvmkcnfkkohh/sql');
  console.log('  File: supabase/migrations/003_admin_system.sql');
}
