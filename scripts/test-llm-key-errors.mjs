/**
 * LLM 키 복호화 에러 처리 검증 스크립트
 *
 * 검증 항목:
 * 1. llmKeyErrorMessage — 모든 에러 타입에 올바른 메시지 반환
 * 2. decrypt() 실패 시나리오별 에러 메시지 분류
 * 3. API 라우트 문자열 매칭 로직 검증
 * 4. getDecryptedLlmKey / getDefaultLlmKeyWithDiagnosis의 에러 분류 로직 단위 테스트
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ═══════════════════════════════════════════════════════════
// 1. llmKeyErrorMessage 단위 테스트
// ═══════════════════════════════════════════════════════════

/** @type {Record<string, string>} */
const ERROR_MESSAGES = {
  no_key: "No LLM API key configured. Please add an API key in settings.",
  decryption_failed:
    "LLM API 키를 복호화할 수 없습니다. 설정에서 API 키를 다시 등록해주세요.",
  env_error: "서버 설정 오류입니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.",
};

function llmKeyErrorMessage(error) {
  switch (error) {
    case "decryption_failed":
      return "LLM API 키를 복호화할 수 없습니다. 설정에서 API 키를 다시 등록해주세요.";
    case "env_error":
      return "서버 설정 오류입니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.";
    case "no_key":
    default:
      return "No LLM API key configured. Please add an API key in settings.";
  }
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

console.log("═══ 1. llmKeyErrorMessage 단위 테스트 ═══\n");

assert(
  llmKeyErrorMessage("no_key") === ERROR_MESSAGES.no_key,
  'no_key → "No LLM API key configured..."',
);
assert(
  llmKeyErrorMessage("decryption_failed") === ERROR_MESSAGES.decryption_failed,
  'decryption_failed → "LLM API 키를 복호화할 수 없습니다..."',
);
assert(
  llmKeyErrorMessage("env_error") === ERROR_MESSAGES.env_error,
  'env_error → "서버 설정 오류입니다..."',
);
assert(
  llmKeyErrorMessage(undefined) === ERROR_MESSAGES.no_key,
  'undefined → fallback to no_key message',
);
assert(
  llmKeyErrorMessage(null) === ERROR_MESSAGES.no_key,
  'null → fallback to no_key message',
);

// ═══════════════════════════════════════════════════════════
// 2. decrypt() 실패 시나리오 시뮬레이션
// ═══════════════════════════════════════════════════════════

console.log("\n═══ 2. decrypt() 실패 시나리오 시뮬레이션 ═══\n");

// 실제 encrypt/decrypt 구현 복제 (ENCRYPTION_KEY 주입 가능)
function makeEncryptDecrypt(keyHex) {
  const ALGORITHM = "aes-256-gcm";
  const IV_LENGTH = 12;
  const TAG_LENGTH = 16;

  function getKey() {
    if (!keyHex) throw new Error("ENCRYPTION_KEY environment variable is not set");
    return Buffer.from(keyHex, "hex");
  }

  function encrypt(plaintext) {
    const key = getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  }

  function decrypt(ciphertext) {
    const key = getKey();
    const parts = ciphertext.split(":");
    if (parts.length !== 3) throw new Error("Invalid ciphertext format");
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH)
      throw new Error("Invalid IV or auth tag length");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  return { encrypt, decrypt };
}

// 정상 키 생성
const validKeyHex = randomBytes(32).toString("hex");
const { encrypt, decrypt } = makeEncryptDecrypt(validKeyHex);

// 시나리오 2-1: 정상 복호화
{
  const encrypted = encrypt("sk-test-key-12345");
  try {
    const result = decrypt(encrypted);
    assert(result === "sk-test-key-12345", "시나리오 2-1: 정상 복호화 성공");
  } catch {
    assert(false, "시나리오 2-1: 정상 복호화 성공");
  }
}

// 시나리오 2-2: ENCRYPTION_KEY 누락
{
  const { decrypt: decryptNoKey } = makeEncryptDecrypt(null);
  const encrypted = encrypt("sk-test-key-12345");
  try {
    decryptNoKey(encrypted);
    assert(false, "시나리오 2-2: ENCRYPTION_KEY 누락 → throw");
  } catch (err) {
    const msg = err.message;
    assert(msg.includes("ENCRYPTION_KEY"), "시나리오 2-2: 에러 메시지에 ENCRYPTION_KEY 포함");
    const isEnvError = msg.includes("ENCRYPTION_KEY");
    assert(isEnvError, "시나리오 2-2: isEnvError=true로 분류");
  }
}

// 시나리오 2-3: 암호문 포맷 오류 (colon 부족)
{
  try {
    decrypt("invalid-ciphertext-no-colons");
    assert(false, "시나리오 2-3: 포맷 오류 → throw");
  } catch (err) {
    const msg = err.message;
    assert(msg.includes("Invalid ciphertext format"), "시나리오 2-3: Invalid ciphertext format");
    const isEnvError = msg.includes("ENCRYPTION_KEY");
    assert(!isEnvError, "시나리오 2-3: isEnvError=false → decryption_failed로 분류");
  }
}

// 시나리오 2-4: IV/tag 길이 불일치
{
  try {
    decrypt("aabb:ccdd:eeff");  // too short IV and tag
    assert(false, "시나리오 2-4: IV/tag 길이 불일치 → throw");
  } catch (err) {
    const msg = err.message;
    assert(
      msg.includes("Invalid IV or auth tag length"),
      "시나리오 2-4: Invalid IV or auth tag length",
    );
    const isEnvError = msg.includes("ENCRYPTION_KEY");
    assert(!isEnvError, "시나리오 2-4: isEnvError=false → decryption_failed로 분류");
  }
}

// 시나리오 2-5: GCM 인증 실패 (다른 키로 복호화 시도)
{
  const differentKeyHex = randomBytes(32).toString("hex");
  const { decrypt: decryptWrongKey } = makeEncryptDecrypt(differentKeyHex);
  const encrypted = encrypt("sk-test-key-12345");
  try {
    decryptWrongKey(encrypted);
    assert(false, "시나리오 2-5: GCM 인증 실패 → throw");
  } catch (err) {
    const msg = err.message;
    // Node.js crypto throws "Unsupported state or unable to authenticate data" for GCM auth failure
    assert(msg.length > 0, `시나리오 2-5: GCM 에러 메시지="${msg}"`);
    const isEnvError = msg.includes("ENCRYPTION_KEY");
    assert(!isEnvError, "시나리오 2-5: isEnvError=false → decryption_failed로 분류");
  }
}

// ═══════════════════════════════════════════════════════════
// 3. API 라우트 문자열 매칭 로직 검증
// ═══════════════════════════════════════════════════════════

console.log("\n═══ 3. API 라우트 문자열 매칭 검증 ═══\n");

// 실제 라우트에서 사용하는 매칭 패턴: message.includes("LLM API") && !message.includes("서버 설정")
function shouldReturn400(message) {
  return message.includes("LLM API") && !message.includes("서버 설정");
}

// no_key 메시지
assert(
  shouldReturn400(ERROR_MESSAGES.no_key),
  'no_key 메시지 → 400 (contains "LLM API", no "서버 설정")',
);

// decryption_failed 메시지
assert(
  shouldReturn400(ERROR_MESSAGES.decryption_failed),
  'decryption_failed 메시지 → 400 (contains "LLM API", no "서버 설정")',
);

// env_error 메시지 → 500이어야 함 (매칭 안 됨)
assert(
  !shouldReturn400(ERROR_MESSAGES.env_error),
  'env_error 메시지 → 500 (contains "서버 설정" → excluded)',
);

// Usage limit 메시지 → 별도 처리
assert(!shouldReturn400("Usage limit reached"), "Usage limit → 매칭 안 됨 (별도 403 처리)");

// 임의 에러 → 500
assert(!shouldReturn400("Some random error"), "기타 에러 → 매칭 안 됨 (500)");

// ═══════════════════════════════════════════════════════════
// 4. 에러 분류 로직 단위 테스트 (classifyDecryptError 시뮬레이션)
// ═══════════════════════════════════════════════════════════

console.log("\n═══ 4. 에러 분류 로직 (isEnvError 판별) ═══\n");

function classifyDecryptError(err) {
  const message = err instanceof Error ? err.message : String(err);
  const isEnvError = message.includes("ENCRYPTION_KEY");
  return isEnvError ? "env_error" : "decryption_failed";
}

assert(
  classifyDecryptError(new Error("ENCRYPTION_KEY environment variable is not set")) ===
    "env_error",
  "ENCRYPTION_KEY 에러 → env_error",
);
assert(
  classifyDecryptError(new Error("Invalid ciphertext format")) === "decryption_failed",
  "포맷 에러 → decryption_failed",
);
assert(
  classifyDecryptError(new Error("Invalid IV or auth tag length")) === "decryption_failed",
  "IV/tag 에러 → decryption_failed",
);
assert(
  classifyDecryptError(new Error("Unsupported state or unable to authenticate data")) ===
    "decryption_failed",
  "GCM 인증 실패 → decryption_failed",
);
assert(
  classifyDecryptError("some string error") === "decryption_failed",
  "문자열 에러 → decryption_failed",
);

// ═══════════════════════════════════════════════════════════
// 5. is_valid 마킹 조건 검증
// ═══════════════════════════════════════════════════════════

console.log("\n═══ 5. is_valid 마킹 조건 검증 ═══\n");

function shouldMarkInvalid(errorMessage) {
  const isEnvError = errorMessage.includes("ENCRYPTION_KEY");
  return !isEnvError; // 환경변수 문제면 키 유지, 키 손상이면 invalid 마킹
}

assert(
  !shouldMarkInvalid("ENCRYPTION_KEY environment variable is not set"),
  "ENCRYPTION_KEY 누락 → is_valid 유지 (인프라 이슈)",
);
assert(
  shouldMarkInvalid("Invalid ciphertext format"),
  "포맷 오류 → is_valid=false 마킹",
);
assert(
  shouldMarkInvalid("Invalid IV or auth tag length"),
  "IV/tag 오류 → is_valid=false 마킹",
);
assert(
  shouldMarkInvalid("Unsupported state or unable to authenticate data"),
  "GCM 인증 실패 → is_valid=false 마킹",
);

// ═══════════════════════════════════════════════════════════
// 결과 요약
// ═══════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(50));
console.log(`결과: ${passed} passed, ${failed} failed`);
console.log("═".repeat(50));

process.exit(failed > 0 ? 1 : 0);
