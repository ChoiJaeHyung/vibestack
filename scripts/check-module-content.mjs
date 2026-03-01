import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from('learning_modules')
  .select('id, title, module_order, content')
  .eq('learning_path_id', 'f5024e3a-5ee9-487f-943e-ef946348fe55')
  .order('module_order')
  .limit(3);

if (error) {
  console.log('Error:', error.message);
} else {
  for (const m of data) {
    const sections = m.content?.sections || [];
    console.log(`Module ${m.module_order}: ${m.title}`);
    console.log(`  sections count: ${sections.length}`);
    if (sections.length > 0) {
      console.log(`  first section type: ${sections[0].type}`);
      console.log(`  first section body (first 200 chars): ${(sections[0].body || '').slice(0, 200)}`);
    } else {
      console.log(`  content keys: ${JSON.stringify(Object.keys(m.content || {}))}`);
      console.log(`  content preview: ${JSON.stringify(m.content).slice(0, 300)}`);
    }
    console.log('---');
  }
}
