import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { authenticateApiKey, isAuthResult } from "@/server/middleware/api-auth";
import { getKBHints } from "@/lib/knowledge";
import type { ConceptHint } from "@/lib/knowledge/types";

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiKey(request);

  if (!isAuthResult(authResult)) {
    return authResult;
  }

  const techsParam = request.nextUrl.searchParams.get("techs");

  if (!techsParam || techsParam.trim().length === 0) {
    return errorResponse("techs query parameter is required (comma-separated)", 400);
  }

  const techNames = techsParam.split(",").map((t) => t.trim()).filter(Boolean);

  if (techNames.length === 0) {
    return errorResponse("At least one tech name is required", 400);
  }

  const entries = await Promise.all(
    techNames.map(async (name) => {
      const hints = await getKBHints(name);
      return [name, hints] as const;
    }),
  );
  const result: Record<string, ConceptHint[]> = {};
  for (const [name, hints] of entries) {
    if (hints.length > 0) {
      result[name] = hints;
    }
  }

  return successResponse({
    techs: result,
    available_count: Object.keys(result).length,
    requested_count: techNames.length,
  });
}
