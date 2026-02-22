"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ─── Plan Price Config ──────────────────────────────────────────────

const PLAN_PRICES: Record<string, { monthly: number }> = {
  pro: { monthly: 1900 },
  team: { monthly: 4900 },
};

// ─── Response Types ─────────────────────────────────────────────────

interface CheckoutSessionResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface PortalSessionResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface CurrentPlanResult {
  success: boolean;
  data?: {
    plan_type: string;
    plan_expires_at: string | null;
  };
  error?: string;
}

// ─── Server Actions ─────────────────────────────────────────────────

export async function createCheckoutSession(
  plan: "pro" | "team",
): Promise<CheckoutSessionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!PLAN_PRICES[plan]) {
      return { success: false, error: "Invalid plan. Must be 'pro' or 'team'" };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { success: false, error: "Stripe is not configured" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return { success: false, error: "App URL is not configured" };
    }

    const stripe = new Stripe(stripeSecretKey);
    const serviceClient = createServiceClient();

    // Fetch current user data for stripe_customer_id
    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return { success: false, error: "User not found" };
    }

    let customerId = userData.stripe_customer_id;

    // Create or retrieve Stripe Customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `VibeStack ${plan} Plan` },
            unit_amount: PLAN_PRICES[plan].monthly,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan,
      },
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing?canceled=true`,
    });

    return { success: true, url: session.url ?? undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

export async function createPortalSession(): Promise<PortalSessionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { success: false, error: "Stripe is not configured" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return { success: false, error: "App URL is not configured" };
    }

    const serviceClient = createServiceClient();

    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return { success: false, error: "User not found" };
    }

    if (!userData.stripe_customer_id) {
      return {
        success: false,
        error: "No active subscription found. Please subscribe first.",
      };
    }

    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${appUrl}/settings/billing`,
    });

    return { success: true, url: session.url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

export async function getCurrentPlan(): Promise<CurrentPlanResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("users")
      .select("plan_type, plan_expires_at")
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
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
