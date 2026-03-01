import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

// ─── Read .env.local ───────────────────────────────────────────────
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const encryptionKey = envVars.ENCRYPTION_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Decryption helper ─────────────────────────────────────────────
const ENCRYPTED_FORMAT_RE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/;

function decryptContent(ciphertext) {
  if (!encryptionKey) return ciphertext;
  if (!ENCRYPTED_FORMAT_RE.test(ciphertext)) return ciphertext;
  try {
    const parts = ciphertext.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const key = Buffer.from(encryptionKey, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return ciphertext;
  }
}

// ─── Config ────────────────────────────────────────────────────────
const LEARNING_PATH_ID = 'f5024e3a-5ee9-487f-943e-ef946348fe55';
const MODULE_ORDERS = [1, 2]; // Modules to generate content for

// ─── Step 1: Get module metadata ───────────────────────────────────
console.log('Step 1: Fetching module metadata...');

const { data: modules, error: modError } = await supabase
  .from('learning_modules')
  .select('id, title, description, module_type, module_order, estimated_minutes, learning_path_id, content')
  .eq('learning_path_id', LEARNING_PATH_ID)
  .in('module_order', MODULE_ORDERS)
  .order('module_order');

if (modError || !modules || modules.length === 0) {
  console.log('Error fetching modules:', modError?.message ?? 'No modules found');
  process.exit(1);
}

for (const m of modules) {
  console.log(`  Module ${m.module_order}: "${m.title}" (${m.module_type})`);
  console.log(`    Description: ${m.description}`);
  console.log(`    Sections count: ${(m.content?.sections || []).length}`);
}

// ─── Step 2: Get project info ──────────────────────────────────────
console.log('\nStep 2: Fetching project data...');

const { data: path, error: pathError } = await supabase
  .from('learning_paths')
  .select('project_id')
  .eq('id', LEARNING_PATH_ID)
  .single();

if (pathError || !path) {
  console.log('Error fetching learning path:', pathError?.message);
  process.exit(1);
}

const projectId = path.project_id;
console.log(`  Project ID: ${projectId}`);

// Get project files
const { data: files, error: filesError } = await supabase
  .from('project_files')
  .select('file_name, file_path, raw_content')
  .eq('project_id', projectId);

if (filesError) {
  console.log('Error fetching files:', filesError.message);
  process.exit(1);
}

console.log(`  Total project files: ${files.length}`);

// Decrypt file contents
const decryptedFiles = files.map(f => ({
  file_path: f.file_path ?? f.file_name,
  raw_content: f.raw_content ? decryptContent(f.raw_content) : '',
}));

// Get relevant files for Next.js modules (pages, layouts, middleware, config)
const CRITICAL_PATH_PATTERNS = [
  /^app\/.*\/page\.tsx?$/,
  /^app\/.*\/layout\.tsx?$/,
  /^app\/api\/.*\.ts$/,
  /^middleware\.ts$/,
  /^middleware\.js$/,
  /^next\.config\.[jt]s$/,
  /^package\.json$/,
  /^tsconfig\.json$/,
];

function isCriticalPath(filePath) {
  return CRITICAL_PATH_PATTERNS.some(re => re.test(filePath));
}

const MAX_CONTENT_LINES = 200;
function truncateContent(content) {
  const lines = content.split('\n');
  if (lines.length <= MAX_CONTENT_LINES) return content;
  return lines.slice(0, MAX_CONTENT_LINES).join('\n') + `\n... [truncated at ${MAX_CONTENT_LINES} lines]`;
}

const relevantCode = decryptedFiles
  .filter(f => isCriticalPath(f.file_path) && f.raw_content.length > 0)
  .map(f => ({
    path: f.file_path,
    content: truncateContent(f.raw_content),
  }));

console.log(`  Relevant code files: ${relevantCode.length}`);
for (const f of relevantCode) {
  console.log(`    - ${f.path} (${f.content.length} chars)`);
}

// ─── Step 3: Build prompt ──────────────────────────────────────────
console.log('\nStep 3: Building content generation prompt...');

// Build the content batch prompt (same logic as buildContentBatchPrompt)
const techName = 'Next.js';
const level = 'beginner';

const modulesSection = modules
  .map(m => `### ${m.title}
- Type: ${m.module_type}
- Description: ${m.description}
- Learning objectives: ${(m.content?.learning_objectives || ['Next.js의 기본 개념 이해', '프로젝트 구조 파악']).join('; ')}`)
  .join('\n\n');

const codeSection = relevantCode.length > 0
  ? relevantCode.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
  : '(no source files available)';

const CONTENT_JSON_SCHEMA = `[
  {
    "module_title": "string (must match the module title from Phase 1)",
    "content": {
      "sections": [
        {
          "type": "explanation | code_example | quiz_question | challenge",
          "title": "string (section heading)",
          "body": "string (markdown content — reference the student's actual code)",
          "code": "string (code snippet, if applicable, otherwise omit)",
          "quiz_options": ["string array (if quiz_question, otherwise omit)"],
          "quiz_answer": number (0-based index of correct option, if quiz_question, otherwise omit),
          "quiz_explanation": "string (explanation of correct answer and why wrong answers are wrong, if quiz_question, otherwise omit)",
          "challenge_starter_code": "string (skeleton code with TODO comments, if challenge, otherwise omit)",
          "challenge_answer_code": "string (complete working solution, if challenge, otherwise omit)"
        }
      ]
    }
  }
]`;

function buildLevelGuidance(level) {
  if (level === 'beginner') {
    return `   - Start with absolute basics ("What is X and why does it exist?")
   - Use simple analogies and everyday language
   - Avoid jargon — when you must use a technical term, define it immediately
   - More concept and quiz modules, fewer practical modules`;
  }
  return '';
}

const prompt = `You are an expert programming instructor creating personalized educational content for a "vibe coder" learning **${techName}**.

The student built a working application using AI coding tools and wants to deeply understand their own code. Your job is to generate module content that directly references their actual project files.

## Student Level: ${level}

## Modules to Generate Content For

${modulesSection}

## Student's Actual Source Code

${codeSection}

## Instructions

Write ALL content in Korean (한국어). Module titles, descriptions, explanations, quiz questions, quiz options, and challenges should all be in Korean. Technical terms (e.g., "middleware", "API route") can stay in English but explanations must be in Korean.

For each module listed above, generate detailed content sections. Follow these rules:

1. **Reference the student's actual code with specific line numbers.** When explaining a concept, point to specific lines in the student's files. For example: "여러분의 \`middleware.ts\`를 보면, 5번째 줄에서 \`updateSession()\`을 호출하고 있어요. 이게 매 요청마다 세션을 갱신하는 역할이에요." Never invent code that doesn't exist in the files above.
2. **Content sections for each module:**
   - \`explanation\` — Clear markdown text explaining a concept, referencing the student's code with specific file paths and line numbers
   - \`code_example\` — An ACTUAL code snippet copied FROM the student's project files above (must include \`code\` field). Include the file path in the title (e.g., "app/api/auth/route.ts 살펴보기"). In the body, explain what each important line does with Korean comments.
   - \`quiz_question\` — Multiple choice question based on the student's actual code (must include \`quiz_options\` and \`quiz_answer\` fields). For example: "\`app/layout.tsx\`에서 \`<html lang='ko'>\`를 사용하는 이유는 무엇일까요?"
   - \`challenge\` — A small, concrete coding challenge the student can try on their own project. Be specific about which file to modify and what to add. For example: "\`app/api/v1/projects/route.ts\`에 새로운 쿼리 파라미터를 추가해서 프로젝트를 상태별로 필터링하는 기능을 만들어 보세요."
3. **Each module MUST have at least 4-6 sections.** Include a good mix of explanation, code_example, quiz_question, and challenge.
4. **Quiz questions** should have exactly 4 options with one correct answer (0-indexed).
5. **For ${level} level:**
${buildLevelGuidance(level)}
6. **For \`project_walkthrough\` modules:** Walk through one of the student's actual files from top to bottom. Start with the imports (각 라이브러리가 무슨 역할인지), then the main logic (핵심 로직 설명), then the exports (다른 파일에서 어떻게 사용되는지). Explain how this file connects to the rest of the project.
7. **For \`code_example\` sections:** Use ACTUAL code snippets FROM the student's files, not invented examples. Include the file path and add Korean comments explaining what each important line does.
8. **For \`challenge\` sections:** Give a small, concrete task the student can try on their own project. Specify the exact file to modify, what to add or change, and what the expected result should be.

## Important Rules

- Output ONLY valid JSON matching the schema below. No markdown code fences, no explanation, no preamble.
- The \`module_title\` field MUST exactly match the module titles listed above.
- Code in \`code\` fields must be copied from the student's actual files. Do NOT invent new code unless it's part of a challenge task.

## Output JSON Schema

${CONTENT_JSON_SCHEMA}`;

console.log(`  Prompt length: ${prompt.length} chars`);

// ─── Step 4: Get user's API key from DB ────────────────────────────
console.log('\nStep 4: Getting LLM API key...');

// Get the test user's ID
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('id')
  .eq('email', 'test@vibestack.dev')
  .single();

if (userError || !userData) {
  console.log('Error fetching user:', userError?.message);
  process.exit(1);
}

// Get default LLM key
const { data: llmKey, error: llmKeyError } = await supabase
  .from('user_llm_keys')
  .select('provider, encrypted_key')
  .eq('user_id', userData.id)
  .eq('is_default', true)
  .single();

if (llmKeyError || !llmKey) {
  console.log('Error fetching LLM key:', llmKeyError?.message);
  process.exit(1);
}

const apiKey = decryptContent(llmKey.encrypted_key);
console.log(`  Provider: ${llmKey.provider}`);
console.log(`  Key prefix: ${apiKey.slice(0, 10)}...`);

// ─── Step 5: Call LLM ──────────────────────────────────────────────
console.log('\nStep 5: Calling Anthropic API (this may take a while)...');

const anthropic = new Anthropic({ apiKey });

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16384,
  messages: [{ role: 'user', content: prompt }],
});

const textBlock = response.content.find(b => b.type === 'text');
if (!textBlock || textBlock.type !== 'text') {
  console.log('No text content in response');
  process.exit(1);
}

console.log(`  Input tokens: ${response.usage.input_tokens}`);
console.log(`  Output tokens: ${response.usage.output_tokens}`);

// ─── Step 6: Parse response ────────────────────────────────────────
console.log('\nStep 6: Parsing response...');

let rawText = textBlock.text.trim();
// Strip code fences if present
if (rawText.startsWith('```')) {
  const firstNewline = rawText.indexOf('\n');
  if (firstNewline !== -1) rawText = rawText.slice(firstNewline + 1);
  if (rawText.endsWith('```')) rawText = rawText.slice(0, -3);
  rawText = rawText.trim();
}

let contentItems;
try {
  const parsed = JSON.parse(rawText);
  if (Array.isArray(parsed)) {
    contentItems = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // Try to find an array in the object
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) {
        contentItems = parsed[key];
        break;
      }
    }
  }
  if (!contentItems) throw new Error('Response is not an array');
} catch (e) {
  console.log('Parse error:', e.message);
  console.log('Raw response (first 500 chars):', rawText.slice(0, 500));
  process.exit(1);
}

console.log(`  Parsed ${contentItems.length} module content items`);

for (const item of contentItems) {
  const sections = item.content?.sections || [];
  console.log(`  "${item.module_title}": ${sections.length} sections`);
  for (const s of sections) {
    console.log(`    - [${s.type}] ${s.title}`);
  }
}

// ─── Step 7: Update DB ─────────────────────────────────────────────
console.log('\nStep 7: Updating database...');

for (const item of contentItems) {
  // Find matching module
  const mod = modules.find(m => m.title === item.module_title)
    || modules.find(m => m.title.trim().toLowerCase() === item.module_title.trim().toLowerCase());

  if (!mod) {
    console.log(`  WARNING: No matching module for "${item.module_title}"`);
    continue;
  }

  const { error: updateError } = await supabase
    .from('learning_modules')
    .update({ content: item.content })
    .eq('id', mod.id);

  if (updateError) {
    console.log(`  ERROR updating module ${mod.module_order}: ${updateError.message}`);
  } else {
    console.log(`  Updated module ${mod.module_order}: "${mod.title}" (${item.content.sections.length} sections)`);
  }
}

console.log('\nDone!');
