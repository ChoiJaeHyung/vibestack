import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // SECURITY: Strip client-sent auth-forwarding headers to prevent spoofing.
  // Only this middleware sets these headers after a verified getUser() call.
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete("x-user-id");
  forwardHeaders.delete("x-user-email");

  let supabaseResponse = NextResponse.next({
    request: { headers: forwardHeaders },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, skip auth checks
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request: { headers: forwardHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Redirect unauthenticated users away from dashboard routes
  const protectedPaths = ["/dashboard", "/projects", "/settings", "/learning", "/admin"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  const authPages = ["/login", "/signup"];
  const isAuthPage = authPages.includes(request.nextUrl.pathname);

  // Forward auth headers to internal API routes (not /api/v1 which uses API key auth)
  // so API handlers can use getAuthUser() fast path instead of redundant getUser() calls
  const isInternalApi =
    request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/api/v1");

  // Only call getUser() when the result actually matters:
  // - protected pages (need auth check + redirect)
  // - auth pages (redirect logged-in users away from login/signup)
  // - internal API routes (forward auth headers, no redirect)
  const needsAuthCheck = isProtectedPath || isAuthPage || isInternalApi;

  if (!needsAuthCheck) {
    return supabaseResponse;
  }

  // Quick bail: if no Supabase auth cookies exist, user is definitely not logged in
  // Note: Supabase SSR may chunk large tokens (e.g. Google OAuth) into
  // sb-xxx-auth-token.0, sb-xxx-auth-token.1, etc. Use includes() to match both
  // single and chunked cookie names.
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"),
  );

  if (!hasAuthCookie) {
    if (isProtectedPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Auth cookie exists — verify with Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Forward verified user info to server components via request headers.
  // This eliminates the duplicate getUser() call in layout (~500ms savings).
  if (user) {
    forwardHeaders.set("x-user-id", user.id);
    forwardHeaders.set("x-user-email", user.email || "");
    const cookies = supabaseResponse.cookies.getAll();
    supabaseResponse = NextResponse.next({
      request: { headers: forwardHeaders },
    });
    cookies.forEach(({ name, value, ...options }) => {
      supabaseResponse.cookies.set(name, value, options);
    });
  }

  return supabaseResponse;
}
