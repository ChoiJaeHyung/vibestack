"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";

const BCRYPT_ROUNDS = 12;
const KEY_PREFIX = "vs_";
const KEY_BYTE_LENGTH = 32;

interface CreateApiKeyResult {
  success: boolean;
  data?: {
    id: string;
    key: string;
    key_prefix: string;
    name: string;
    created_at: string;
  };
  error?: string;
}

export async function createApiKey(name: string = "default"): Promise<CreateApiKeyResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const rawKey = KEY_PREFIX + randomBytes(KEY_BYTE_LENGTH).toString("hex");
    const keyPrefix = rawKey.slice(0, 7);
    const keyHash = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

    const { data, error } = await supabase
      .from("user_api_keys")
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name,
      })
      .select("id, key_prefix, name, created_at")
      .single();

    if (error) {
      return { success: false, error: "Failed to create API key" };
    }

    return {
      success: true,
      data: {
        id: data.id,
        key: rawKey,
        key_prefix: data.key_prefix,
        name: data.name,
        created_at: data.created_at,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface ListApiKeysResult {
  success: boolean;
  data?: Array<{
    id: string;
    key_prefix: string;
    name: string;
    last_used_at: string | null;
    is_active: boolean;
    created_at: string;
  }>;
  error?: string;
}

export async function listApiKeys(): Promise<ListApiKeysResult> {
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
      .from("user_api_keys")
      .select("id, key_prefix, name, last_used_at, is_active, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to list API keys" };
    }

    return { success: true, data: data ?? [] };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface RevokeApiKeyResult {
  success: boolean;
  error?: string;
}

export async function revokeApiKey(keyId: string): Promise<RevokeApiKeyResult> {
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
      .from("user_api_keys")
      .update({ is_active: false })
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to revoke API key" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteApiKey(keyId: string): Promise<RevokeApiKeyResult> {
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
      .from("user_api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to delete API key" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
