import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { successResponse, errorResponse } from "@/lib/utils/api-response";
import { encrypt } from "@/lib/utils/encryption";

interface BillingKeyRequestBody {
  authKey: string;
  customerKey: string;
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

    const body = (await request.json()) as BillingKeyRequestBody;
    const { authKey, customerKey } = body;

    if (!authKey || !customerKey) {
      return errorResponse("Missing required fields: authKey, customerKey", 400);
    }

    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return errorResponse("TossPayments is not configured", 500);
    }

    // 빌링키 발급 API 호출
    const issueResponse = await fetch(
      "https://api.tosspayments.com/v1/billing/authorizations/issue",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ authKey, customerKey }),
      },
    );

    const issueData = await issueResponse.json();

    if (!issueResponse.ok) {
      return errorResponse(
        issueData.message ?? "빌링키 발급에 실패했습니다",
        issueResponse.status,
      );
    }

    // 빌링키 저장
    const serviceClient = createServiceClient();
    await serviceClient
      .from("users")
      .update({
        toss_billing_key: encrypt(issueData.billingKey),
        toss_customer_key: customerKey,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return successResponse({ registered: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "빌링키 발급 중 오류가 발생했습니다";
    return errorResponse(message, 500);
  }
}
