const { withSentryConfig } = require("@sentry/nextjs");
const { getImageRemotePatterns } = require("./src/config/imageRemotePatterns");

// Baseline security headers (securityheaders.com "easy wins").
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // DENY aligns with frame-ancestors 'none' in the CSP; both must be
  // consistent so legacy and modern browsers receive the same restriction.
  { key: "X-Frame-Options", value: "DENY" },
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
    remotePatterns: getImageRemotePatterns(),
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
  sentryUrl: process.env.SENTRY_URL,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // The plugin's default on a release/upload failure is to throw and fail
  // the whole build — too strict for source maps, which are an
  // observability nicety, not something that should block a deploy
  // (especially against a self-hosted backend like GlitchTip, whose API
  // doesn't fully mirror Sentry's release-management endpoints).
  errorHandler: (err) => {
    console.warn("Sentry release/source-map upload failed:", err);
  },
});
