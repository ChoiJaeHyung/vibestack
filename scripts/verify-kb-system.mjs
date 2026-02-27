/**
 * KB 시스템 검증 스크립트
 *
 * 1. 마이그레이션 적용 (service_role로 SQL 실행)
 * 2. 시드 데이터 확인
 * 3. getKBFromDB 검증
 * 4. generateKBForTech 플로우 검증 (INSERT → UPDATE)
 * 5. 동시성 검증 (UNIQUE 충돌)
 * 6. failed 재시도 검증
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ─── Load env ────────────────────────────────────────────────────────
const envContent = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✅ ${name}`);
}

function fail(name, detail) {
  failed++;
  console.error(`  ❌ ${name}: ${detail}`);
}

// ─── Step 1: Apply Migration ─────────────────────────────────────────
console.log('\n[1/6] 마이그레이션 적용...');

// Supabase REST API doesn't support raw SQL, so we use the pg-meta API
// or just check if table exists first, then create if needed
const { data: tableCheck, error: tableCheckErr } = await supabase
  .from('technology_knowledge')
  .select('id')
  .limit(1);

if (tableCheckErr && tableCheckErr.message.includes('does not exist')) {
  // Table doesn't exist — need to apply migration via Supabase Dashboard
  // Let's try using the Supabase Management API
  console.log('  테이블이 없습니다. SQL Editor로 마이그레이션을 실행합니다...');

  const migrationSql = readFileSync('supabase/migrations/007_technology_knowledge.sql', 'utf8');

  // Try using rpc to execute SQL (requires pg_net or custom function)
  // Fallback: use the /rest/v1/rpc endpoint
  const { error: rpcError } = await supabase.rpc('exec_sql', { sql: migrationSql });

  if (rpcError) {
    console.log('  ⚠️  RPC 방식 실패. Supabase Dashboard SQL Editor에서 직접 실행이 필요합니다.');
    console.log(`  파일: supabase/migrations/007_technology_knowledge.sql`);
    console.log('  계속하려면 마이그레이션을 먼저 적용해주세요.');
    process.exit(1);
  }
  ok('마이그레이션 적용 완료');
} else if (tableCheckErr) {
  fail('테이블 확인', tableCheckErr.message);
  process.exit(1);
} else {
  console.log('  ℹ️  테이블이 이미 존재합니다. 마이그레이션 스킵.');
}

// ─── Step 2: Verify Seed Data ────────────────────────────────────────
console.log('\n[2/6] 시드 데이터 확인...');

const EXPECTED_SEEDS = ['next.js', 'react', 'typescript', 'supabase', 'tailwind css'];

const { data: seeds, error: seedErr } = await supabase
  .from('technology_knowledge')
  .select('technology_name, technology_name_normalized, source, generation_status, concepts')
  .eq('source', 'seed');

if (seedErr) {
  fail('시드 조회', seedErr.message);
} else if (!seeds || seeds.length === 0) {
  fail('시드 데이터', '시드 데이터가 0건입니다');
} else {
  const seedNames = seeds.map(s => s.technology_name_normalized);

  for (const expected of EXPECTED_SEEDS) {
    if (seedNames.includes(expected)) {
      const seed = seeds.find(s => s.technology_name_normalized === expected);
      const conceptCount = Array.isArray(seed.concepts) ? seed.concepts.length : 0;
      if (conceptCount > 0) {
        ok(`${seed.technology_name} — ${conceptCount}개 개념, status=${seed.generation_status}`);
      } else {
        fail(`${expected}`, `concepts가 비어있음 (JSONB 파싱 문제 가능)`);
      }
    } else {
      fail(`${expected}`, '시드 데이터 누락');
    }
  }
}

// ─── Step 3: Verify DB Read (getKBFromDB pattern) ────────────────────
console.log('\n[3/6] DB 읽기 검증 (getKBFromDB 패턴)...');

// Test: ready status returns data
const { data: readyData } = await supabase
  .from('technology_knowledge')
  .select('concepts, source')
  .eq('technology_name_normalized', 'next.js')
  .eq('generation_status', 'ready')
  .maybeSingle();

if (readyData && Array.isArray(readyData.concepts) && readyData.concepts.length > 0) {
  ok(`Next.js 조회 성공 — ${readyData.concepts.length}개 개념`);
} else {
  fail('Next.js 조회', 'ready 상태 데이터를 가져오지 못함');
}

// Test: non-existent tech returns null
const { data: nonExistent } = await supabase
  .from('technology_knowledge')
  .select('concepts, source')
  .eq('technology_name_normalized', 'nonexistent-tech-xyz')
  .eq('generation_status', 'ready')
  .maybeSingle();

if (nonExistent === null) {
  ok('존재하지 않는 기술 조회 → null');
} else {
  fail('존재하지 않는 기술 조회', `null이 아닌 값 반환: ${JSON.stringify(nonExistent)}`);
}

// ─── Step 4: Verify INSERT + UPDATE flow ─────────────────────────────
console.log('\n[4/6] INSERT → UPDATE 플로우 검증...');

const TEST_TECH = '__test_kb_verify__';

// Clean up any previous test data
await supabase
  .from('technology_knowledge')
  .delete()
  .eq('technology_name_normalized', TEST_TECH);

// Step 4a: INSERT with generating status
const { error: insertErr } = await supabase
  .from('technology_knowledge')
  .insert({
    technology_name: 'TestKB',
    technology_name_normalized: TEST_TECH,
    version: '1.0',
    concepts: [],
    source: 'llm_generated',
    generation_status: 'generating',
  });

if (insertErr) {
  fail('INSERT generating', insertErr.message);
} else {
  ok('INSERT generating 성공');
}

// Step 4b: UPDATE to ready with concepts
const testConcepts = [{
  concept_key: 'test-concept',
  concept_name: '테스트 개념',
  key_points: ['포인트1', '포인트2'],
  common_quiz_topics: ['퀴즈1'],
  prerequisite_concepts: [],
  tags: ['test'],
}];

const { error: updateErr } = await supabase
  .from('technology_knowledge')
  .update({
    concepts: testConcepts,
    generation_status: 'ready',
    generated_at: new Date().toISOString(),
    llm_provider: 'test',
    llm_model: 'test-model',
    generation_error: null,
    updated_at: new Date().toISOString(),
  })
  .eq('technology_name_normalized', TEST_TECH);

if (updateErr) {
  fail('UPDATE ready', updateErr.message);
} else {
  // Verify the update
  const { data: updated } = await supabase
    .from('technology_knowledge')
    .select('concepts, generation_status, llm_provider')
    .eq('technology_name_normalized', TEST_TECH)
    .single();

  if (updated?.generation_status === 'ready' && Array.isArray(updated.concepts) && updated.concepts.length === 1) {
    ok(`UPDATE ready 성공 — concepts=${updated.concepts.length}개, provider=${updated.llm_provider}`);
  } else {
    fail('UPDATE ready 검증', JSON.stringify(updated));
  }
}

// ─── Step 5: Verify UNIQUE constraint ────────────────────────────────
console.log('\n[5/6] UNIQUE 제약 검증 (동시성 방어)...');

const { error: dupeErr } = await supabase
  .from('technology_knowledge')
  .insert({
    technology_name: 'TestKB-Dupe',
    technology_name_normalized: TEST_TECH, // same normalized name
    version: '2.0',
    concepts: [],
    source: 'llm_generated',
    generation_status: 'generating',
  });

if (dupeErr && dupeErr.code === '23505') {
  ok(`UNIQUE 충돌 정상 감지 — code=${dupeErr.code}`);
} else if (dupeErr) {
  fail('UNIQUE 검증', `예상치 못한 에러: ${dupeErr.code} ${dupeErr.message}`);
} else {
  fail('UNIQUE 검증', 'INSERT가 성공해버림 — UNIQUE 제약이 작동하지 않음');
}

// ─── Step 6: Verify failed retry (optimistic lock) ───────────────────
console.log('\n[6/6] failed 재시도 + optimistic lock 검증...');

// Set to failed state
const { error: failSetErr } = await supabase
  .from('technology_knowledge')
  .update({
    generation_status: 'failed',
    generation_error: 'Test failure',
    updated_at: new Date().toISOString(),
  })
  .eq('technology_name_normalized', TEST_TECH);

if (failSetErr) {
  fail('failed 상태 설정', failSetErr.message);
} else {
  // Read the current state
  const { data: failedRow } = await supabase
    .from('technology_knowledge')
    .select('generation_status, updated_at')
    .eq('technology_name_normalized', TEST_TECH)
    .single();

  if (failedRow?.generation_status !== 'failed') {
    fail('failed 상태 확인', `status=${failedRow?.generation_status}`);
  } else {
    ok('failed 상태 설정 성공');

    // Optimistic lock: reclaim with correct updated_at
    const { data: claimed } = await supabase
      .from('technology_knowledge')
      .update({
        generation_status: 'generating',
        generation_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('technology_name_normalized', TEST_TECH)
      .eq('updated_at', failedRow.updated_at)
      .in('generation_status', ['failed', 'generating'])
      .select('id')
      .maybeSingle();

    if (claimed) {
      ok('optimistic lock reclaim 성공');

      // Try reclaim again with OLD updated_at (should fail - simulates race condition)
      const { data: raceClaimed } = await supabase
        .from('technology_knowledge')
        .update({
          generation_status: 'generating',
          generation_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('technology_name_normalized', TEST_TECH)
        .eq('updated_at', failedRow.updated_at) // OLD timestamp — should not match
        .in('generation_status', ['failed', 'generating'])
        .select('id')
        .maybeSingle();

      if (!raceClaimed) {
        ok('optimistic lock race condition 방어 성공 (stale updated_at로 reclaim 실패)');
      } else {
        fail('race condition 방어', 'stale updated_at로 reclaim이 성공해버림');
      }
    } else {
      fail('optimistic lock reclaim', 'claimed가 null');
    }
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────
await supabase
  .from('technology_knowledge')
  .delete()
  .eq('technology_name_normalized', TEST_TECH);

// ─── Summary ─────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`결과: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
