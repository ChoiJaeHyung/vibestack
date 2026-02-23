import { encrypt, decrypt } from "./encryption";

/**
 * Encrypt file content for storage in DB.
 * Returns the `iv:tag:encrypted` ciphertext string.
 */
export function encryptContent(content: string): string {
  return encrypt(content);
}

// AES-256-GCM produces: 12-byte IV (24 hex chars) : 16-byte tag (32 hex chars) : ciphertext (hex)
// Ciphertext can be empty (e.g. encrypting an empty string), so we use * not +.
const ENCRYPTED_FORMAT_RE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/;

/**
 * Decrypt file content read from DB.
 * If the value matches the `iv:tag:encrypted` format with exact IV (24 hex)
 * and auth tag (32 hex) lengths, it is decrypted. Otherwise it is returned
 * as-is for backward compatibility with plaintext data written before
 * encryption was enabled.
 */
export function decryptContent(ciphertext: string): string {
  if (ENCRYPTED_FORMAT_RE.test(ciphertext)) {
    try {
      return decrypt(ciphertext);
    } catch {
      // If decryption fails, treat as plaintext (data may predate encryption)
      return ciphertext;
    }
  }
  return ciphertext;
}
