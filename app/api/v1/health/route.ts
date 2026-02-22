import { successResponse } from "@/lib/utils/api-response";
import { APP_VERSION } from "@/lib/utils/constants";
import { HealthResponse } from "@/types/api";

export async function GET() {
  return successResponse<HealthResponse>({
    status: "ok",
    version: APP_VERSION,
  });
}
