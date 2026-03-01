import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createHmac, timingSafeEqual } from "crypto";

interface TossWebhookPayload {
  eventType: string;
  createdAt: string;
  data: {
    paymentKey: string;
    orderId: string;
    status: string;
    method?: string;
  };
}

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.TOSS_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("TOSS_WEBHOOK_SECRET environment variable is not set");
  }
  const computed = createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature
    const signature = request.headers.get("toss-signature");
    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing webhook signature" },
        { status: 401 },
      );
    }
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    const body = JSON.parse(rawBody) as TossWebhookPayload;
    const { eventType, data } = body;

    if (eventType !== "PAYMENT_STATUS_CHANGED") {
      return NextResponse.json({ success: true, received: true });
    }

    const serviceClient = createServiceClient();

    const { data: payment } = await serviceClient
      .from("payments")
      .select("id, user_id, plan")
      .eq("order_id", data.orderId)
      .single();

    if (!payment) {
      console.error("[toss-webhook] Payment not found for orderId:", data.orderId);
      return NextResponse.json({ success: true, received: true });
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
