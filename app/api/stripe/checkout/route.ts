import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

const PLAN_PRICES: Record<string, { monthly: number }> = {
  pro: { monthly: 1900 },
  team: { monthly: 4900 },
};

interface CheckoutRequestBody {
  plan: string;
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

    const body = (await request.json()) as CheckoutRequestBody;
    const { plan } = body;

    if (!plan || !PLAN_PRICES[plan]) {
      return errorResponse("Invalid plan. Must be 'pro' or 'team'", 400);
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return errorResponse("Stripe is not configured", 500);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return errorResponse("App URL is not configured", 500);
    }

    const stripe = new Stripe(stripeSecretKey);

    // Fetch current user data for stripe_customer_id
    const serviceClient = createServiceClient();
    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return errorResponse("User not found", 404);
    }

    let customerId = userData.stripe_customer_id;

    // Create or retrieve Stripe Customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: { user_id: user.id },
      });

      customerId = customer.id;

      // Store stripe_customer_id in users table
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

    return successResponse({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return errorResponse(message, 500);
  }
}
