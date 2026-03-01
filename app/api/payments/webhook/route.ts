import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { timingSafeEqual } from "crypto";

interface TossWebhookPayload {
  eventType: string;
  createdAt: string;
  data: {
    paymentKey: string;
    orderId: string;
    status: string;
    method?: string;
    secret?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TossWebhookPayload;
    const { eventType, data } = body;

    if (eventType !== "PAYMENT_STATUS_CHANGED") {
      return NextResponse.json({ success: true, received: true });
    }

    const serviceClient = createServiceClient();

    // orderId로 결제 레코드 조회 (secret 포함)
    const { data: payment } = await serviceClient
      .from("payments")
      .select("id, user_id, plan, toss_secret")
      .eq("order_id", data.orderId)
      .single();

    if (!payment) {
      console.error("[toss-webhook] Payment not found for orderId:", data.orderId);
      return NextResponse.json({ success: true, received: true });
    }

    // 토스 웹훅 검증: DB에 저장된 secret과 웹훅 body의 secret 비교
    if (!payment.toss_secret) {
      // secret이 아직 저장 안 된 경우 (confirm 전) — 위조 방지를 위해 거부
      console.warn("[toss-webhook] Rejected: no stored secret for orderId:", data.orderId);
      return NextResponse.json({ success: true, received: true });
    }

    if (!data.secret) {
      console.error("[toss-webhook] Rejected: no secret in webhook payload for orderId:", data.orderId);
      return NextResponse.json(
        { success: false, error: "Missing webhook secret" },
        { status: 401 },
      );
    }

    try {
      const isValid = timingSafeEqual(
        Buffer.from(payment.toss_secret),
        Buffer.from(data.secret),
      );
      if (!isValid) {
        console.error("[toss-webhook] Secret mismatch for orderId:", data.orderId);
        return NextResponse.json(
          { success: false, error: "Invalid webhook secret" },
          { status: 401 },
        );
      }
    } catch {
      console.error("[toss-webhook] Secret verification failed for orderId:", data.orderId);
      return NextResponse.json(
        { success: false, error: "Invalid webhook secret" },
        { status: 401 },
      );
    }

    // 결제 상태 업데이트
    type PaymentStatus = "pending" | "done" | "canceled" | "failed";
    const statusMap: Record<string, PaymentStatus> = {
      DONE: "done",
      CANCELED: "canceled",
      PARTIAL_CANCELED: "canceled",
      ABORTED: "failed",
      EXPIRED: "failed",
    };

    const mappedStatus = statusMap[data.status];
    if (mappedStatus) {
      const { error: statusError } = await serviceClient
        .from("payments")
        .update({
          status: mappedStatus as PaymentStatus,
          payment_key: data.paymentKey,
          method: data.method ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", data.orderId)
        .select();

      if (statusError) {
        console.error("[toss-webhook] Failed to update payment status:", statusError);
        return NextResponse.json(
          { success: false, error: "Failed to update payment status" },
          { status: 500 },
        );
      }
    }

    // 결제 실패/취소 시 플랜 다운그레이드
    if (data.status === "CANCELED" || data.status === "ABORTED" || data.status === "EXPIRED") {
      const { error: planError } = await serviceClient
        .from("users")
        .update({
          plan_type: "free",
          plan_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.user_id)
        .select();

      if (planError) {
        console.error("[toss-webhook] Failed to downgrade user plan:", planError);
        return NextResponse.json(
          { success: false, error: "Failed to downgrade user plan" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler error";
    console.error("[toss-webhook] Error processing event:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
