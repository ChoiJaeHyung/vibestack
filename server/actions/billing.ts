"use server";

import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ─── Plan Price Config ──────────────────────────────────────────────

const PLAN_PRICES: Record<string, { monthly: number }> = {
  pro: { monthly: 25000 },   // ₩25,000
  team: { monthly: 59000 },  // ₩59,000
};

// ─── Response Types ─────────────────────────────────────────────────

interface PaymentRequestResult {
  success: boolean;
  data?: {
    orderId: string;
    amount: number;
    orderName: string;
    customerKey: string;
  };
  error?: string;
}

interface CurrentPlanResult {
  success: boolean;
  data?: {
    plan_type: string;
    plan_expires_at: string | null;
    has_billing_key: boolean;
  };
  error?: string;
}

interface CancelResult {
  success: boolean;
  data?: {
    message: string;
    expiresAt: string | null;
  };
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
    created_at: string;
  }>;
  error?: string;
}

// ─── Server Actions ─────────────────────────────────────────────────

export async function createPaymentRequest(
  plan: "pro" | "team",
): Promise<PaymentRequestResult> {
  try {
    const user = await getAuthUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!PLAN_PRICES[plan]) {
      return { success: false, error: "Invalid plan. Must be 'pro' or 'team'" };
    }

    const serviceClient = createServiceClient();

    // customerKey 조회 또는 생성
    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("toss_customer_key")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return { success: false, error: "User not found" };
    }

    let customerKey = userData.toss_customer_key;
    if (!customerKey) {
      customerKey = `cust_${user.id}`;
      await serviceClient
        .from("users")
        .update({
          toss_customer_key: customerKey,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    const orderId = `order_${user.id}_${Date.now()}`;
    const amount = PLAN_PRICES[plan].monthly;
    const orderName = `VibeUniv ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;

    // 결제 레코드 미리 생성 (confirm 시 조회용)
    await serviceClient.from("payments").insert({
      user_id: user.id,
      order_id: orderId,
      plan,
      amount,
      status: "pending",
    });

    return {
      success: true,
      data: { orderId, amount, orderName, customerKey },
    };
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
      .select("plan_type, plan_expires_at, toss_billing_key")
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
        has_billing_key: !!data.toss_billing_key,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function cancelSubscription(): Promise<CancelResult> {
  try {
    const user = await getAuthUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const serviceClient = createServiceClient();

    const { data: userData, error: userError } = await serviceClient
      .from("users")
      .select("toss_billing_key, plan_type, plan_expires_at")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return { success: false, error: "User not found" };
    }

    if (userData.plan_type === "free") {
      return { success: false, error: "already_free_plan" };
    }

    // 빌링키 삭제 (자동결제 중단)
    await serviceClient
      .from("users")
      .update({
        toss_billing_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // plan_expires_at이 없으면 즉시 free 전환
    if (!userData.plan_expires_at) {
      await serviceClient
        .from("users")
        .update({
          plan_type: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return {
      success: true,
      data: {
        message: "subscription_cancelled",
        expiresAt: userData.plan_expires_at,
      },
    };
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
      .select("id, order_id, plan, amount, status, method, is_recurring, created_at")
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
