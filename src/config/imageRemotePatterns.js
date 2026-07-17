/**
 * Single source of truth for which logo URLs next/image is allowed to render
 * remotely. Consumed by next.config.js (`images.remotePatterns`, so Next
 * actually allows fetching them) and by src/schemas/logoSchema.ts (so an
 * admin-submitted logo URL from any other host is rejected at save time
 * instead of saving fine and only breaking the public page with a
 * "hostname is not configured" error at render time). Keep this the only
 * place that lists allowed logo hosts - don't duplicate the list elsewhere.
 *
 * Plain CommonJS (not TypeScript) because next.config.js requires it
 * directly at build/start time, before any TS transpilation happens.
 *
 * @param {boolean} isDev
 * @returns {{protocol: "http"|"https", hostname: string, port?: string, pathname: string}[]}
 */
function getImageRemotePatterns(isDev) {
  return [
    // Supabase public storage (avatars, logos)
    {
      protocol: "https",
      hostname: "*.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
    // Google Cloud Storage buckets (generic)
    {
      protocol: "https",
      hostname: "*.storage.googleapis.com",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "storage.googleapis.com",
      pathname: "/**",
    },
    // Firebase Storage endpoints
    {
      protocol: "https",
      hostname: "firebasestorage.googleapis.com",
      pathname: "/v0/b/**",
    },
    // Local Supabase storage gateway (dev only)
    ...(isDev
      ? [
          {
            protocol: "http",
            hostname: "127.0.0.1",
            port: "54321",
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : []),
  ];
}

module.exports = { getImageRemotePatterns };
