import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Not authenticated", 401);
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return errorResponse("Stripe is not configured", 500);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return errorResponse("App URL is not configured", 500);
    }

    // Get stripe_customer_id from users table
    const serviceClient = createServiceClient();
    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return errorResponse("User not found", 404);
    }

    if (!userData.stripe_customer_id) {
      return errorResponse("No active subscription found. Please subscribe first.", 400);
    }

    const stripe = new Stripe(stripeSecretKey);

    // Create Stripe Billing Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${appUrl}/settings/billing`,
    });

    return successResponse({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create portal session";
    return errorResponse(message, 500);
  }
}
