const {
  publicDataRuntimeCaching,
} = require("./src/config/publicDataRuntimeCaching");
const { withSentryConfig } = require("@sentry/nextjs/config");
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
  experimental: {
    // PWA/Sentry add webpack hooks, disabling Next's default build worker.
    webpackBuildWorker: true,
    optimizePackageImports: ["@mynaui/icons-react"],
  },
  images: {
    remotePatterns: getImageRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...["/assets/:path*", "/icons/:path*", "/google-wallet/:path*"].map(
        (source) => ({
          source,
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=3600, must-revalidate",
            },
          ],
        })
      ),
      // Only content-hashed files belong here; new bytes require a new URL.
      {
        source: "/assets/optimized/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // Homepage data lives in HTML/RSC; do not prepend the start-url cache rule.
  cacheStartUrl: false,
  dynamicStartUrl: false,
  fallbacks: { document: "/offline.html" },
  extendDefaultRuntimeCaching: true,
  workboxOptions: { runtimeCaching: publicDataRuntimeCaching },
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
  // Upload once after compiler workers exit, instead of inside each compiler.
  useRunAfterProductionCompileHook: true,
  telemetry: false,
  sourcemaps: {
    // Local and credential-free CI builds have nowhere to upload maps.
    disable: !(
      process.env.SENTRY_AUTH_TOKEN &&
      process.env.SENTRY_ORG &&
      process.env.SENTRY_PROJECT
    ),
    deleteSourcemapsAfterUpload: true,
  },
});
