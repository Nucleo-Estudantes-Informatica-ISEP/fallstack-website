const isDev = process.env.NODE_ENV !== "production";
const { withSentryConfig } = require("@sentry/nextjs");
const { getImageRemotePatterns } = require("./src/config/imageRemotePatterns");

// Baseline security headers (securityheaders.com "easy wins").
// Full Content-Security-Policy is deferred — it needs tuning against Next's
// inline scripts and the PWA service worker (see plan #29).
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: getImageRemotePatterns(isDev),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
});

module.exports = withSentryConfig(withPWA(nextConfig), {
  // Unset, this defaults to sentry.io - override for a self-hosted
  // Sentry-compatible backend (e.g. GlitchTip). The DSN alone doesn't
  // control this: it only routes runtime error events, while source-map
  // upload during `next build` is a separate step that needs its own
  // upload target.
  url: process.env.SENTRY_URL,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
