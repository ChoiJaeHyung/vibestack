import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { sendWelcomeProEmail } from "@/server/actions/email-notifications";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }

  const serviceClient = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan as "pro" | "team" | undefined;

        if (!userId || !plan) {
          console.error("[stripe-webhook] Missing metadata in checkout session:", session.id);
          break;
        }

        // plan 업그레이드 + stripe IDs 저장
        await serviceClient
          .from("users")
          .update({
            plan_type: plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // 결제 레코드 저장
        const orderId = `stripe_${session.id}`;
        await serviceClient.from("payments").insert({
          user_id: userId,
          order_id: orderId,
          plan,
          amount: session.amount_total ?? 0,
          status: "done",
          method: session.payment_method_types?.[0] ?? "card",
          stripe_session_id: session.id,
          currency: session.currency ?? "usd",
        });

        console.log("[stripe-webhook] Checkout completed for user:", userId, "plan:", plan);

        // Send welcome email for Pro upgrade
        if (plan === "pro" || plan === "team") {
          const { data: userData } = await serviceClient
            .from("users")
            .select("email, nickname")
            .eq("id", userId)
            .single();
          if (userData?.email) {
            sendWelcomeProEmail(userData.email, userData.nickname ?? "there").catch((err) =>
              console.error("[stripe-webhook] Welcome email failed:", err),
            );
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // customer ID로 사용자 조회
        const { data: user } = await serviceClient
          .from("users")
          .select("id, plan_type")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!user) {
          console.warn("[stripe-webhook] User not found for customer:", customerId);
          break;
        }

        // 구독 상태에 따른 plan 반영
        if (subscription.status === "active") {
          const priceId = subscription.items.data[0]?.price.id;
          let plan: "pro" | "team" = "pro";
          if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
            plan = "team";
          }

          await serviceClient
            .from("users")
            .update({
              plan_type: plan,
              stripe_subscription_id: subscription.id,
              plan_expires_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          console.log("[stripe-webhook] Subscription updated for user:", user.id, "plan:", plan);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: user } = await serviceClient
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!user) {
          console.warn("[stripe-webhook] User not found for customer:", customerId);
          break;
        }

        // Free 플랜으로 다운그레이드
        await serviceClient
          .from("users")
          .update({
            plan_type: "free",
            stripe_subscription_id: null,
            plan_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        console.log("[stripe-webhook] Subscription deleted, downgraded user:", user.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          "[stripe-webhook] Payment failed for customer:",
          invoice.customer,
          "invoice:",
          invoice.id,
        );
        break;
      }

      default:
        // 처리하지 않는 이벤트 타입은 무시
        break;
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler error";
    console.error("[stripe-webhook] Error processing event:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
