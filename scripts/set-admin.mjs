import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually
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

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from('users')
  .update({ role: 'super_admin' })
  .eq('email', 'test@vibestack.dev')
  .select('email, role');

if (error) {
  console.error('Error:', error.message);
} else {
  console.log('Updated:', JSON.stringify(data));
}
