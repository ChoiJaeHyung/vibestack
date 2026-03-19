import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let _client: ReturnType<typeof createClient<Database>> | null = null;

export function createServiceClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  _client = createClient<Database>(url, serviceKey);
  return _client;
}
