import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminAuthResult } from "@/server/middleware/admin-auth";
import { generateSeedTemplates } from "@/server/actions/template-expansion";
import type { Locale } from "@/types/database";

/**
 * POST /api/admin/templates/seed
 *
 * Triggers seed template generation for the initial 5 technologies.
 * Admin-only. Calls LLM to generate content_templates data.
 *
 * Body: { locale?: "ko" | "en" }
 * Response: { totalTemplates, errors, duration }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!isAdminAuthResult(auth)) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const locale: Locale = body.locale === "en" ? "en" : "ko";

    const startTime = Date.now();
    const result = await generateSeedTemplates(locale);
    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      data: {
        totalTemplates: result.totalTemplates,
        errors: result.errors,
        duration: `${duration}s`,
        locale,
      },
    });
  } catch (err) {
    console.error("[admin/templates/seed] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: "Seed generation failed" },
      { status: 500 },
    );
  }
}
