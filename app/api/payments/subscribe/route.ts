import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { decrypt } from "@/lib/utils/encryption";

const PLAN_PRICES: Record<string, number> = {
  pro: 25000,
  team: 59000,
};

interface SubscribeRequestBody {
  plan: "pro" | "team";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Not authenticated", 401);
    }

    const body = (await request.json()) as SubscribeRequestBody;
    const { plan } = body;

    if (!plan || !PLAN_PRICES[plan]) {
      return errorResponse("Invalid plan. Must be 'pro' or 'team'", 400);
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return errorResponse("TossPayments is not configured", 500);
    }

    const serviceClient = createServiceClient();

    // 사용자 빌링키 조회
    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("toss_billing_key, toss_customer_key")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return errorResponse("User not found", 404);
    }

    if (!userData.toss_billing_key) {
      return errorResponse("빌링키가 등록되지 않았습니다. 먼저 카드를 등록해주세요.", 400);
    }

    const decryptedBillingKey = decrypt(userData.toss_billing_key);

    const orderId = `sub_${user.id}_${Date.now()}`;
    const amount = PLAN_PRICES[plan];

    // 빌링키로 자동결제 실행
    const billingResponse = await fetch(
      `https://api.tosspayments.com/v1/billing/${decryptedBillingKey}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerKey: userData.toss_customer_key,
          amount,
          orderId,
          orderName: `VibeUniv ${plan} Plan`,
        }),
      },
    );

    const billingData = await billingResponse.json();

    if (!billingResponse.ok) {
      return errorResponse(
        billingData.message ?? "자동결제에 실패했습니다",
        billingResponse.status,
      );
    }

    // 결제 기록 저장
    const { error: insertError } = await serviceClient.from("payments").insert({
      user_id: user.id,
      order_id: orderId,
      payment_key: billingData.paymentKey,
      plan,
      amount,
      status: "done",
      method: billingData.method ?? "CARD",
      is_recurring: true,
    });

    if (insertError) {
      console.error("[payments/subscribe] Failed to insert payment:", insertError);
      return errorResponse("결제는 완료되었으나 기록 저장에 실패했습니다. 고객센터에 문의해주세요.", 500);
    }

    // plan_expires_at 갱신
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error: planError } = await serviceClient
      .from("users")
      .update({
        plan_type: plan,
        plan_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select();

    if (planError) {
      console.error("[payments/subscribe] Failed to update user plan:", planError);
      return errorResponse("결제는 완료되었으나 플랜 업데이트에 실패했습니다. 고객센터에 문의해주세요.", 500);
    }

    return successResponse({ status: "done", plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "자동결제 중 오류가 발생했습니다";
    return errorResponse(message, 500);
  }
}
