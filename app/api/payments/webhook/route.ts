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
    if (payment.toss_secret && data.secret) {
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
    } else if (!payment.toss_secret) {
      // secret이 아직 저장 안 된 경우 (pending 상태에서 웹훅 도착)
      // orderId 매칭만으로 진행 (confirm 전에 웹훅이 올 수 있음)
      console.warn("[toss-webhook] No stored secret for orderId:", data.orderId);
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
      await serviceClient
        .from("payments")
        .update({
          status: mappedStatus as PaymentStatus,
          payment_key: data.paymentKey,
          method: data.method ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", data.orderId);
    }

    // 결제 실패/취소 시 플랜 다운그레이드
    if (data.status === "CANCELED" || data.status === "ABORTED" || data.status === "EXPIRED") {
      await serviceClient
        .from("users")
        .update({
          plan_type: "free",
          plan_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.user_id);
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
