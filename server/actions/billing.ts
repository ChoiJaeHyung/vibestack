"use server";

import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";

// ─── Response Types ─────────────────────────────────────────────────

interface CheckoutSessionResult {
  success: boolean;
  data?: { url: string };
  error?: string;
}

interface CurrentPlanResult {
  success: boolean;
  data?: {
    plan_type: string;
    plan_expires_at: string | null;
    has_subscription: boolean;
  };
  error?: string;
}

interface PortalSessionResult {
  success: boolean;
  data?: { url: string };
  error?: string;
}

interface PaymentHistoryResult {
  success: boolean;
  data?: Array<{
    id: string;
    order_id: string;
    plan: string;
    amount: number;
    status: string;
    method: string | null;
    is_recurring: boolean;
    currency: string;
    created_at: string;
  }>;
  error?: string;
}

// ─── Price Config ───────────────────────────────────────────────────

const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  team: process.env.STRIPE_TEAM_PRICE_ID,
};

// ─── Server Actions ─────────────────────────────────────────────────

export async function createCheckoutSession(
  plan: "pro" | "team",
): Promise<CheckoutSessionResult> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return { success: false, error: "Invalid plan" };
    }

    const serviceClient = createServiceClient();

    // Stripe Customer 조회 또는 생성
    const { data: userData } = await serviceClient
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = userData?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await serviceClient
        .from("users")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan,
      },
    });

    if (!session.url) {
      return { success: false, error: "Failed to create checkout session" };
    }

    return { success: true, data: { url: session.url } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

export async function getCurrentPlan(): Promise<CurrentPlanResult> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("plan_type, plan_expires_at, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return { success: false, error: "Failed to fetch plan information" };
    }

    return {
      success: true,
      data: {
        plan_type: data.plan_type,
        plan_expires_at: data.plan_expires_at,
        has_subscription: !!data.stripe_subscription_id,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function createPortalSession(): Promise<PortalSessionResult> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const serviceClient = createServiceClient();
    const { data: userData } = await serviceClient
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!userData?.stripe_customer_id) {
      return { success: false, error: "No subscription found" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${appUrl}/settings/billing`,
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

export async function getPaymentHistory(): Promise<PaymentHistoryResult> {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("id, order_id, plan, amount, status, method, is_recurring, currency, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return { success: false, error: "Failed to fetch payment history" };
    }

    return { success: true, data: data ?? [] };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
