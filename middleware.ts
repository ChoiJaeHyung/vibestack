import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimit } from "@/lib/utils/rate-limit";

const RATE_LIMITS: Record<string, number> = {
  "/api/v1": 60,
  "/api/auth": 10,
  "/api/payments": 20,
};

function getRateLimitKey(request: NextRequest, prefix: string): string {
  if (prefix === "/api/v1") {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return `v1:${authHeader.slice(7)}`;
    }
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}

function matchRateLimitPrefix(pathname: string): string | null {
  for (const prefix of Object.keys(RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}

// Public pages that never need auth checks (skip Supabase round-trip)
const PUBLIC_PATHS = ["/callback", "/guide", "/robots.txt", "/sitemap.xml", "/icon.png", "/apple-icon.png", "/manifest.webmanifest"];

function detectLocaleFromHeader(request: NextRequest): "ko" | "en" {
  const acceptLang = request.headers.get("accept-language");
  if (!acceptLang) return "en";
  const preferred = acceptLang
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.trim().split("-")[0].toLowerCase(), quality: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.quality - a.quality);
  for (const { lang } of preferred) {
    if (lang === "ko") return "ko";
    if (lang === "en") return "en";
  }
  return "en";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Supabase session check for public/static paths
  if (PUBLIC_PATHS.includes(pathname)) {
    // Still set locale cookie on first visit for public pages
    if (!request.cookies.has("locale")) {
      const locale = detectLocaleFromHeader(request);
      const response = NextResponse.next();
      response.cookies.set("locale", locale, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }
    return NextResponse.next();
  }

  // Rate limiting for API routes
  const prefix = matchRateLimitPrefix(pathname);
  if (prefix) {
    const limit = RATE_LIMITS[prefix];
    const key = getRateLimitKey(request, prefix);
    const result = rateLimit(key, limit);

    if (!result.success) {
      const retryAfter = Math.ceil(
        result.reset - Date.now() / 1000
      );
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset),
            "Retry-After": String(Math.max(retryAfter, 1)),
          },
        }
      );
    }

    const response = await updateSession(request);
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));
    return response;
  }

  const response = await updateSession(request);

  // Set locale cookie on first visit for non-API paths
  if (!request.cookies.has("locale") && !pathname.startsWith("/api/")) {
    const locale = detectLocaleFromHeader(request);
    response.cookies.set("locale", locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
