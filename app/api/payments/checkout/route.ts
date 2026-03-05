import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";

const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  team: process.env.STRIPE_TEAM_PRICE_ID,
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { plan?: string };
    const plan = body.plan;

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 },
      );
    }

    const priceId = PRICE_IDS[plan]!;
    const serviceClient = createServiceClient();

    // Stripe Customer 조회 또는 생성
    const { data: userData } = await serviceClient
      .from("users")
      .select("stripe_customer_id, email")
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

    // Stripe Checkout Session 생성
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?success=true`,
      cancel_url: `${origin}/settings/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan,
      },
    });

    return NextResponse.json({ success: true, data: { url: session.url } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    console.error("[stripe-checkout] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
