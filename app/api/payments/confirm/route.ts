import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

interface ConfirmRequestBody {
  paymentKey: string;
  orderId: string;
  amount: number;
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

    const body = (await request.json()) as ConfirmRequestBody;
    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || !amount) {
      return errorResponse("Missing required fields: paymentKey, orderId, amount", 400);
    }

    // 서버측 결제 금액 검증: DB에 저장된 pending 결제 레코드와 비교
    const serviceClient = createServiceClient();
    const { data: pendingPayment, error: pendingError } = await serviceClient
      .from("payments")
      .select("amount, plan")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (pendingError || !pendingPayment) {
      return errorResponse("Pending payment record not found", 404);
    }

    if (pendingPayment.amount !== amount) {
      return errorResponse("Payment amount mismatch", 400);
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return errorResponse("TossPayments is not configured", 500);
    }

    // 결제 승인 API 호출
    const confirmResponse = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      },
    );

    const confirmData = await confirmResponse.json();

    if (!confirmResponse.ok) {
      return errorResponse(
        confirmData.message ?? "payment_confirm_failed",
        confirmResponse.status,
      );
    }

    // 결제 기록 업데이트 (secret 저장 — 웹훅 검증용)
    const { error: paymentError } = await serviceClient
      .from("payments")
      .update({
        payment_key: paymentKey,
        status: "done",
        method: confirmData.method ?? null,
        toss_secret: confirmData.secret ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .select();

    if (paymentError) {
      console.error("[payments/confirm] Failed to update payment:", paymentError);
      return errorResponse("payment_record_save_failed", 500);
    }

    // 사용자 플랜 업데이트
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error: planError } = await serviceClient
      .from("users")
      .update({
        plan_type: pendingPayment.plan,
        plan_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select();

    if (planError) {
      console.error("[payments/confirm] Failed to update user plan:", planError);
      return errorResponse("plan_update_failed", 500);
    }

    return successResponse({ status: "done", plan: pendingPayment.plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "payment_confirm_error";
    return errorResponse(message, 500);
  }
}
