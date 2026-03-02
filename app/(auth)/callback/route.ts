import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Validate redirect target: must be a relative path, reject protocol-relative URLs
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (code) {
    const cookiesToSet: Array<{
      name: string;
      value: string;
      options?: Record<string, unknown>;
    }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies) {
            cookies.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            cookiesToSet.push(...cookies);
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      let redirectUrl: string;
      if (isLocalEnv) {
        redirectUrl = `${origin}${next}`;
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
      } else {
        redirectUrl = `${origin}${next}`;
      }

      const response = NextResponse.redirect(redirectUrl);

      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });

      // Sync locale between cookie and DB
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const cookieLocale = request.cookies.get("locale")?.value;
          const serviceClient = createServiceClient();
          const { data: dbUser } = await serviceClient
            .from("users")
            .select("locale")
            .eq("id", user.id)
            .single();

          const dbLocale = dbUser?.locale ?? "ko";

          if (dbLocale === "ko" && cookieLocale && cookieLocale !== "ko" && (cookieLocale === "en")) {
            // First login: DB has default 'ko' but cookie differs → update DB to match cookie
            await serviceClient
              .from("users")
              .update({ locale: cookieLocale })
              .eq("id", user.id);
          } else if (dbLocale !== cookieLocale) {
            // Existing user with intentionally set locale → set cookie to match DB
            response.cookies.set("locale", dbLocale, {
              path: "/",
              sameSite: "lax",
              maxAge: 31536000,
            });
          }
        }
      } catch {
        // Locale sync is best-effort, don't block auth flow
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
