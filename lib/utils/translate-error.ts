/**
 * Translate a server error code using the Errors namespace.
 * If the code matches a key in Errors.json, returns the translated string.
 * Otherwise, returns the original string as-is (for unexpected/generic errors).
 */
export function translateError(
  error: string,
  t: (key: string) => string,
): string {
  // Try to look up the error code in the Errors namespace
  const translated = t(error);
  // next-intl returns the key path when no translation is found
  // If translated === the raw key, it means no translation exists
  if (translated !== error) {
    return translated;
  }
  return error;
}
