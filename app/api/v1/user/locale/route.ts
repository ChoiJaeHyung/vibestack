import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("users")
      .select("locale")
      .eq("id", authResult.userId)
      .single();

    const locale = data?.locale === "en" ? "en" : "ko";

    return successResponse({ locale });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
