import { NextResponse } from "next/server";
import { getUsageData } from "@/server/actions/usage";

export async function GET() {
  try {
    const result = await getUsageData();
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Not authenticated" ? 401 : 500 },
      );
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
