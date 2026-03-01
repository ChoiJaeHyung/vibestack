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
        confirmData.message ?? "결제 승인에 실패했습니다",
        confirmResponse.status,
      );
    }

    const serviceClient = createServiceClient();

    // payments 테이블에서 주문 정보 조회
    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .select("plan")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .single();

    if (paymentError || !payment) {
      return errorResponse("Payment record not found", 404);
    }

    // 결제 기록 업데이트
    await serviceClient
      .from("payments")
      .update({
        payment_key: paymentKey,
        status: "done",
        method: confirmData.method ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    // 사용자 플랜 업데이트
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await serviceClient
      .from("users")
      .update({
        plan_type: payment.plan,
        plan_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return successResponse({ status: "done", plan: payment.plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "결제 승인 중 오류가 발생했습니다";
    return errorResponse(message, 500);
  }
}
