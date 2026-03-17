import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://www.google.com https://tpc.googlesyndication.com https://www.googletagmanager.com https://fundingchoicesmessages.google.com https://*.sentry.io",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://pagead2.googlesyndication.com https://www.google.com https://www.google.co.kr https://googleads.g.doubleclick.net",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google-analytics.com https://*.analytics.google.com https://*.sentry.io https://ep1.adtrafficquality.google https://fundingchoicesmessages.google.com",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy",
          value: cspDirectives.join("; "),
        },
      ],
    },
  ],
};

const configWithIntl = withNextIntl(nextConfig);

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithIntl, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      disableLogger: true,
    })
  : configWithIntl;
