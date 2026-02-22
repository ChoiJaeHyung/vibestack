import { NextResponse } from "next/server";
import { ApiResponse } from "@/types/api";

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status },
  );
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message },
    { status },
  );
}
