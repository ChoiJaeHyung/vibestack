"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encrypt, decrypt } from "@/lib/utils/encryption";
import { createLLMProvider } from "@/lib/llm/factory";

type LlmProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "groq"
  | "mistral"
  | "deepseek"
  | "cohere"
  | "together"
  | "fireworks"
  | "xai"
  | "openrouter";

interface LlmKeyItem {
  id: string;
  provider: LlmProvider;
  display_hint: string | null;
  is_valid: boolean;
  is_default: boolean;
  last_verified_at: string | null;
  created_at: string;
}

interface SaveLlmKeyResult {
  success: boolean;
  data?: {
    id: string;
    provider: string;
    display_hint: string;
    is_default: boolean;
    created_at: string;
  };
  error?: string;
}

export async function saveLlmKey(
  provider: LlmProvider,
  apiKey: string,
  isDefault: boolean = false,
): Promise<SaveLlmKeyResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Encrypt the API key using AES-256-GCM
    const encryptedValue = encrypt(apiKey);
    const parts = encryptedValue.split(":");
    if (parts.length !== 3) {
      return { success: false, error: "Encryption failed" };
    }

    const keyIv = parts[0];

    // Create a display hint showing first 4 and last 4 characters
    const displayHint =
      apiKey.length > 8
        ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
        : "****";

    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await supabase
        .from("user_llm_keys")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    // Check if key already exists for this provider
    const { data: existing } = await supabase
      .from("user_llm_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (existing) {
      // Update existing key
      const { data, error } = await supabase
        .from("user_llm_keys")
        .update({
          encrypted_key: encryptedValue,
          key_iv: keyIv,
          display_hint: displayHint,
          is_valid: true,
          is_default: isDefault,
          last_verified_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .select("id, provider, display_hint, is_default, created_at")
        .single();

      if (error || !data) {
        return { success: false, error: "Failed to update LLM key" };
      }

      return {
        success: true,
        data: {
          id: data.id,
          provider: data.provider,
          display_hint: data.display_hint ?? "",
          is_default: data.is_default,
          created_at: data.created_at,
        },
      };
    }

    // Check if this is the first key (auto-set as default)
    const { count } = await supabase
      .from("user_llm_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const shouldBeDefault = isDefault || (count ?? 0) === 0;

    // Insert new key
    const { data, error } = await supabase
      .from("user_llm_keys")
      .insert({
        user_id: user.id,
        provider,
        encrypted_key: encryptedValue,
        key_iv: keyIv,
        display_hint: displayHint,
        is_valid: true,
        is_default: shouldBeDefault,
        last_verified_at: new Date().toISOString(),
      })
      .select("id, provider, display_hint, is_default, created_at")
      .single();

    if (error || !data) {
      return { success: false, error: "Failed to save LLM key" };
    }

    return {
      success: true,
      data: {
        id: data.id,
        provider: data.provider,
        display_hint: data.display_hint ?? "",
        is_default: data.is_default,
        created_at: data.created_at,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface ListLlmKeysResult {
  success: boolean;
  data?: LlmKeyItem[];
  error?: string;
}

export async function listLlmKeys(): Promise<ListLlmKeysResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("user_llm_keys")
      .select(
        "id, provider, display_hint, is_valid, is_default, last_verified_at, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to list LLM keys" };
    }

    return { success: true, data: (data ?? []) as LlmKeyItem[] };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface DeleteLlmKeyResult {
  success: boolean;
  error?: string;
}

export async function deleteLlmKey(
  keyId: string,
): Promise<DeleteLlmKeyResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("user_llm_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to delete LLM key" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Decrypt and return a user's LLM API key for a specific provider.
 * This is for internal/server-side use only.
 */
export async function getDecryptedLlmKey(
  userId: string,
  provider: LlmProvider,
): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("user_llm_keys")
      .select("encrypted_key, is_valid")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("is_valid", true)
      .single();

    if (error || !data) {
      return null;
    }

    return decrypt(data.encrypted_key);
  } catch {
    return null;
  }
}

/**
 * Get the user's default LLM key (or first available valid key).
 * Returns both provider name and decrypted API key.
 */
export async function getDefaultLlmKeyForUser(
  userId: string,
): Promise<{ provider: LlmProvider; apiKey: string } | null> {
  try {
    const supabase = createServiceClient();

    // Single query: order by is_default DESC so default key comes first, then by created_at
    const { data, error } = await supabase
      .from("user_llm_keys")
      .select("provider, encrypted_key")
      .eq("user_id", userId)
      .eq("is_valid", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    const apiKey = decrypt(data.encrypted_key);
    return {
      provider: data.provider as LlmProvider,
      apiKey,
    };
  } catch {
    return null;
  }
}

interface ValidateLlmKeyResult {
  success: boolean;
  valid?: boolean;
  error?: string;
}

export async function validateLlmKey(
  provider: LlmProvider,
  apiKey: string,
): Promise<ValidateLlmKeyResult> {
  try {
    const llmProvider = createLLMProvider(provider, apiKey);

    // Test the key with a simple chat request
    const result = await llmProvider.chat({
      messages: [{ role: "user", content: "Say hello in one word." }],
    });

    if (result.content && result.content.length > 0) {
      return { success: true, valid: true };
    }

    return { success: true, valid: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Validation failed";
    return { success: false, valid: false, error: message };
  }
}

interface SetDefaultLlmKeyResult {
  success: boolean;
  error?: string;
}

export async function setDefaultLlmKey(
  keyId: string,
): Promise<SetDefaultLlmKeyResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // First, unset all defaults for this user
    const { error: unsetError } = await supabase
      .from("user_llm_keys")
      .update({ is_default: false })
      .eq("user_id", user.id);

    if (unsetError) {
      return { success: false, error: "Failed to update default key" };
    }

    // Set the new default
    const { error: setError } = await supabase
      .from("user_llm_keys")
      .update({ is_default: true })
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (setError) {
      return { success: false, error: "Failed to set default key" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
