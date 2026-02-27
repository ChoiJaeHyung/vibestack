/**
 * KB 파싱 + DB 저장 E2E 테스트
 *
 * 실제 LLM이 반환할 수 있는 다양한 형태의 응답을 파싱하여
 * DB에 저장하는 전체 플로우를 검증합니다.
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ─── parseConceptsFromLLM (matches server/actions/knowledge.ts) ─────
function parseConceptsFromLLM(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array of concepts');
  }
  return parsed.map((item, idx) => {
    if (
      typeof item.concept_key !== 'string' ||
      typeof item.concept_name !== 'string' ||
      !Array.isArray(item.key_points) ||
      !Array.isArray(item.common_quiz_topics) ||
      !Array.isArray(item.tags)
    ) {
      throw new Error(`Invalid concept at index ${idx}: missing required fields`);
    }
    return {
      concept_key: item.concept_key,
      concept_name: item.concept_name,
      key_points: item.key_points,
      common_quiz_topics: item.common_quiz_topics,
      prerequisite_concepts: Array.isArray(item.prerequisite_concepts) ? item.prerequisite_concepts : [],
      tags: item.tags,
    };
  });
}

let passed = 0;
let failed = 0;

function ok(name) { passed++; console.log(`  ✅ ${name}`); }
function fail(name, detail) { failed++; console.error(`  ❌ ${name}: ${detail}`); }

// ─── Test 1: Clean JSON array ────────────────────────────────────────
console.log('\n[Test 1] Clean JSON array 파싱...');

const cleanJson = JSON.stringify([
  {
    concept_key: 'chart-basics',
    concept_name: '차트 기본 개념',
    key_points: ['Recharts는 React 컴포넌트로 차트를 만듦', 'SVG 기반 렌더링'],
    common_quiz_topics: ['차트 컴포넌트 종류'],
    prerequisite_concepts: [],
    tags: ['recharts', 'data-visualization'],
  },
  {
    concept_key: 'responsive-container',
    concept_name: '반응형 컨테이너',
    key_points: ['ResponsiveContainer로 자동 크기 조정', 'width/height를 %로 설정'],
    common_quiz_topics: ['반응형 차트 구현'],
    prerequisite_concepts: ['chart-basics'],
    tags: ['recharts', 'responsive'],
  },
]);

try {
  const concepts = parseConceptsFromLLM(cleanJson);
  if (concepts.length === 2 && concepts[0].concept_key === 'chart-basics') {
    ok(`Clean JSON: ${concepts.length}개 개념 파싱`);
  } else {
    fail('Clean JSON', `예상과 다른 결과: ${concepts.length}`);
  }
} catch (e) {
  fail('Clean JSON', e.message);
}

// ─── Test 2: Markdown code fence ─────────────────────────────────────
console.log('\n[Test 2] Markdown 코드 펜스 파싱...');

const fencedJson = `\`\`\`json
[
  {
    "concept_key": "basic-routing",
    "concept_name": "기본 라우팅",
    "key_points": ["Express 라우터 사용법", "GET/POST 핸들러"],
    "common_quiz_topics": ["라우팅 메서드"],
    "prerequisite_concepts": [],
    "tags": ["express", "routing"]
  }
]
\`\`\``;

try {
  const concepts = parseConceptsFromLLM(fencedJson);
  if (concepts.length === 1 && concepts[0].concept_key === 'basic-routing') {
    ok(`Markdown fence: ${concepts.length}개 개념 파싱`);
  } else {
    fail('Markdown fence', `예상과 다른 결과`);
  }
} catch (e) {
  fail('Markdown fence', e.message);
}

// ─── Test 3: Code fence without json language ────────────────────────
console.log('\n[Test 3] 언어 없는 코드 펜스...');

const plainFence = `\`\`\`
[{"concept_key":"a","concept_name":"A","key_points":["1"],"common_quiz_topics":["q"],"tags":["t"]}]
\`\`\``;

try {
  const concepts = parseConceptsFromLLM(plainFence);
  ok(`Plain fence: ${concepts.length}개 개념`);
} catch (e) {
  fail('Plain fence', e.message);
}

// ─── Test 4: Missing required field → error ──────────────────────────
console.log('\n[Test 4] 필수 필드 누락 시 에러...');

const invalidJson = JSON.stringify([
  { concept_key: 'missing-fields', concept_name: '누락 테스트' }
  // missing key_points, common_quiz_topics, tags
]);

try {
  parseConceptsFromLLM(invalidJson);
  fail('필수 필드 누락', '에러가 발생해야 하는데 성공함');
} catch (e) {
  if (e.message.includes('missing required fields')) {
    ok('필수 필드 누락 시 에러 정상 발생');
  } else {
    fail('필수 필드 누락', `다른 에러: ${e.message}`);
  }
}

// ─── Test 5: Empty array → should still parse (caught by caller) ─────
console.log('\n[Test 5] 빈 배열 파싱...');

try {
  const concepts = parseConceptsFromLLM('[]');
  if (concepts.length === 0) {
    ok('빈 배열 파싱 성공 (호출자가 검증)');
  }
} catch (e) {
  fail('빈 배열', e.message);
}

// ─── Test 6: Not JSON → error ────────────────────────────────────────
console.log('\n[Test 6] 유효하지 않은 JSON...');

try {
  parseConceptsFromLLM('I apologize, here are the concepts...');
  fail('잘못된 JSON', '에러가 발생해야 하는데 성공함');
} catch {
  ok('잘못된 JSON 시 에러 정상 발생');
}

// ─── Test 7: Full DB flow with realistic LLM output ──────────────────
console.log('\n[Test 7] DB 저장 + 조회 (실제 LLM 출력 시뮬레이션)...');

const TEST_TECH = 'Recharts';
const normalized = TEST_TECH.toLowerCase().trim();

// Cleanup
await supabase.from('technology_knowledge').delete().eq('technology_name_normalized', normalized);

// Simulate full generateKBForTech flow
// Step A: Insert generating lock
const { error: insertErr } = await supabase
  .from('technology_knowledge')
  .insert({
    technology_name: TEST_TECH,
    technology_name_normalized: normalized,
    version: '2.x',
    concepts: [],
    source: 'llm_generated',
    generation_status: 'generating',
  });

if (insertErr) {
  fail('DB INSERT', insertErr.message);
} else {
  ok('DB INSERT generating 성공');
}

// Step B: Simulate LLM response (realistic Korean KB content)
const simulatedLLMResponse = `\`\`\`json
[
  {
    "concept_key": "recharts-basics",
    "concept_name": "Recharts 기초",
    "key_points": [
      "Recharts는 React 기반 차트 라이브러리로, 컴포넌트 조합으로 차트를 만듦",
      "LineChart, BarChart, PieChart 등 기본 차트 타입 제공",
      "데이터는 배열 형태로 전달하며, dataKey로 필드를 매핑"
    ],
    "common_quiz_topics": [
      "Recharts의 기본 차트 컴포넌트 종류",
      "데이터 배열과 dataKey의 관계"
    ],
    "prerequisite_concepts": [],
    "tags": ["recharts", "data-viz", "react"]
  },
  {
    "concept_key": "responsive-charts",
    "concept_name": "반응형 차트",
    "key_points": [
      "ResponsiveContainer로 부모 크기에 맞게 자동 조정",
      "width와 height를 % 또는 px로 설정 가능",
      "모바일과 데스크톱 모두 대응하는 차트 구현"
    ],
    "common_quiz_topics": [
      "ResponsiveContainer 사용법",
      "반응형 차트 크기 설정"
    ],
    "prerequisite_concepts": ["recharts-basics"],
    "tags": ["recharts", "responsive", "layout"]
  },
  {
    "concept_key": "chart-customization",
    "concept_name": "차트 커스터마이징",
    "key_points": [
      "Tooltip, Legend, CartesianGrid 등으로 차트 꾸미기",
      "stroke, fill, radius 등 스타일 속성으로 디자인 변경",
      "커스텀 라벨과 틱(tick) 포맷터 사용"
    ],
    "common_quiz_topics": [
      "Tooltip 커스터마이징 방법",
      "축 라벨 포맷팅"
    ],
    "prerequisite_concepts": ["recharts-basics"],
    "tags": ["recharts", "customization", "styling"]
  },
  {
    "concept_key": "data-transformation",
    "concept_name": "데이터 변환과 가공",
    "key_points": [
      "API 응답 데이터를 차트에 맞는 형태로 변환",
      "날짜/시간 데이터 포맷팅과 축 설정",
      "집계 함수와 그룹화로 의미있는 시각화"
    ],
    "common_quiz_topics": [
      "데이터 형태 변환 패턴",
      "시계열 데이터 차트 구현"
    ],
    "prerequisite_concepts": ["recharts-basics"],
    "tags": ["recharts", "data", "transformation"]
  },
  {
    "concept_key": "interactive-features",
    "concept_name": "인터랙티브 기능",
    "key_points": [
      "onClick, onMouseEnter 등 이벤트 핸들러",
      "Brush 컴포넌트로 데이터 범위 선택",
      "애니메이션 효과와 트랜지션 설정"
    ],
    "common_quiz_topics": [
      "차트 이벤트 처리",
      "Brush 컴포넌트 활용"
    ],
    "prerequisite_concepts": ["chart-customization"],
    "tags": ["recharts", "interaction", "animation"]
  }
]
\`\`\``;

// Step C: Parse
const concepts = parseConceptsFromLLM(simulatedLLMResponse);
if (concepts.length === 5) {
  ok(`파싱 성공: ${concepts.length}개 개념`);
} else {
  fail('파싱', `예상 5개, 실제 ${concepts.length}개`);
}

// Step D: Update to ready
const now = new Date().toISOString();
const { error: updateErr } = await supabase
  .from('technology_knowledge')
  .update({
    concepts,
    generation_status: 'ready',
    generated_at: now,
    llm_provider: 'anthropic',
    llm_model: 'claude-sonnet-4-20250514',
    generation_error: null,
    updated_at: now,
  })
  .eq('technology_name_normalized', normalized);

if (updateErr) {
  fail('DB UPDATE', updateErr.message);
} else {
  ok('DB UPDATE ready 성공');
}

// Step E: Read back (same pattern as getKBFromDB)
const { data: readBack } = await supabase
  .from('technology_knowledge')
  .select('concepts, source')
  .eq('technology_name_normalized', normalized)
  .eq('generation_status', 'ready')
  .maybeSingle();

if (readBack && Array.isArray(readBack.concepts) && readBack.concepts.length === 5) {
  ok(`DB 재조회: ${readBack.concepts.length}개 개념, source=${readBack.source}`);

  // Verify concept structure after DB round-trip
  const c = readBack.concepts[0];
  if (c.concept_key === 'recharts-basics' && c.concept_name === 'Recharts 기초' && c.key_points.length === 3) {
    ok('JSONB round-trip 무손실 확인');
  } else {
    fail('JSONB round-trip', `구조 불일치: ${JSON.stringify(c).slice(0, 100)}`);
  }
} else {
  fail('DB 재조회', `null 또는 빈 배열`);
}

// ─── Cleanup (keep the generated KB for inspection) ──────────────────
// Don't delete — leave it for manual inspection

// ─── Final KB status ─────────────────────────────────────────────────
console.log('\n[최종 KB 현황]');

const { data: allKB } = await supabase
  .from('technology_knowledge')
  .select('technology_name, source, generation_status, llm_model');

if (allKB) {
  for (const kb of allKB) {
    const icon = kb.generation_status === 'ready' ? '✅' : '❌';
    const src = kb.source === 'seed' ? '시드' : `LLM(${kb.llm_model || 'simulated'})`;
    console.log(`  ${icon} ${kb.technology_name} — ${src}`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`결과: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
