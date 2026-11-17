import type { NextConfig } from "next";

/**
 * Security headers for every route.
 * CSP notes:
 *  - script-src needs 'unsafe-inline' for Next.js' own hydration/bootstrap inline scripts
 *    (upgrade path: nonce-based CSP via a proxy/middleware; documented in README).
 *  - Stripe hosted Checkout is a full-page redirect, so only js/checkout/api.stripe.com are allowed.
 *  - No external images/fonts/analytics are used at all.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://api.stripe.com https://checkout.stripe.com",
  "frame-src https://js.stripe.com https://checkout.stripe.com",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      // The app pages hold sensitive in-memory state; never let the browser/bfcache keep a copy.
      { source: "/", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
      { source: "/success", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
      { source: "/vault", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
    ];
  },
};

export default nextConfig;
