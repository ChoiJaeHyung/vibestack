import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";

function getPlanFromAmount(amount: number): "pro" | "team" {
  if (amount >= 4900) return "team";
  return "pro";
}

function getNextMonthDate(): string {
  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { success: false, error: "Stripe is not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook signature verification failed";
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
        const plan = session.metadata?.plan;

        if (!userId) {
          console.error("[stripe-webhook] checkout.session.completed: missing user_id in metadata");
          break;
        }

        // Determine plan from metadata or from subscription amount
        let planType: "pro" | "team" = "pro";
        if (plan === "pro" || plan === "team") {
          planType = plan;
        } else if (session.amount_total) {
          planType = getPlanFromAmount(session.amount_total);
        }

        await serviceClient
          .from("users")
          .update({
            plan_type: planType,
            plan_expires_at: getNextMonthDate(),
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const { data: userData } = await serviceClient
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!userData) {
          console.error("[stripe-webhook] customer.subscription.updated: user not found for customer", customerId);
          break;
        }

        // Determine plan from subscription items
        const subscriptionItem = subscription.items.data[0];
        if (subscriptionItem) {
          const amount = subscriptionItem.price.unit_amount ?? 0;
          const planType = getPlanFromAmount(amount);

          const periodEnd = new Date(subscriptionItem.current_period_end * 1000).toISOString();

          await serviceClient
            .from("users")
            .update({
              plan_type: planType,
              plan_expires_at: periodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userData.id);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: userData } = await serviceClient
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!userData) {
          console.error("[stripe-webhook] customer.subscription.deleted: user not found for customer", customerId);
          break;
        }

        await serviceClient
          .from("users")
          .update({
            plan_type: "free",
            plan_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userData.id);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.error(
          "[stripe-webhook] invoice.payment_failed for customer:",
          customerId,
          "invoice:",
          invoice.id,
        );

        const { data: failedUser } = await serviceClient
          .from("users")
          .select("id, email")
          .eq("stripe_customer_id", customerId)
          .single();

        if (failedUser) {
          console.warn(
            "[stripe-webhook] Payment failed for user:",
            failedUser.id,
            failedUser.email,
            "invoice:",
            invoice.id,
          );
          // TODO: Send email notification to user about payment failure
          // TODO: Consider adding a payment_failed_at column to the users table
        } else {
          console.error(
            "[stripe-webhook] invoice.payment_failed: user not found for customer",
            customerId,
          );
        }

        break;
      }

      default:
        // Unhandled event type
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
