import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { errorResponse } from "@/lib/utils/api-response";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

type ApiKeyUpdate = Database["public"]["Tables"]["user_api_keys"]["Update"];

interface AuthResult {
  userId: string;
  keyId: string;
}

export async function authenticateApiKey(
  request: NextRequest,
): Promise<AuthResult | Response> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse("Missing or invalid Authorization header", 401);
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith("vs_")) {
    return errorResponse("Invalid API key format", 401);
  }

  try {
    const supabase = createServiceClient();
    const keyPrefix = apiKey.slice(0, 7);

    const { data: keys, error } = await supabase
      .from("user_api_keys")
      .select("id, user_id, key_hash")
      .eq("key_prefix", keyPrefix)
      .eq("is_active", true);

    if (error) {
      return errorResponse("Authentication service error", 500);
    }

    if (!keys || keys.length === 0) {
      return errorResponse("Invalid API key", 401);
    }

    for (const key of keys) {
      const isMatch = await bcrypt.compare(apiKey, key.key_hash);
      if (isMatch) {
        const keyUpdate: ApiKeyUpdate = { last_used_at: new Date().toISOString() };
        supabase
          .from("user_api_keys")
          .update(keyUpdate)
          .eq("id", key.id)
          .then();

        return { userId: key.user_id, keyId: key.id };
      }
    }

    return errorResponse("Invalid API key", 401);
  } catch {
    return errorResponse("Authentication failed", 500);
  }
}

export function isAuthResult(
  result: AuthResult | Response,
): result is AuthResult {
  return "userId" in result;
}
