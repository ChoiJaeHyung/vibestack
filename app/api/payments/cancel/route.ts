import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Not authenticated", 401);
    }

    const serviceClient = createServiceClient();

    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("toss_billing_key, plan_type, plan_expires_at")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return errorResponse("User not found", 404);
    }

    if (userData.plan_type === "free") {
      return errorResponse("already_free_plan", 400);
    }

    // 빌링키 삭제 (자동결제 중단)
    await serviceClient
      .from("users")
      .update({
        toss_billing_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // plan_expires_at이 있으면 기간 만료 후 free로 전환
    // plan_expires_at이 없으면 즉시 free로 전환
    if (!userData.plan_expires_at) {
      await serviceClient
        .from("users")
        .update({
          plan_type: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return successResponse({
      message: "subscription_cancelled",
      expiresAt: userData.plan_expires_at,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "subscription_cancel_error";
    return errorResponse(message, 500);
  }
}
