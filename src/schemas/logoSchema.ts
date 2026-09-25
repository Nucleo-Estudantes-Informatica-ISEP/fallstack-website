import { z } from "zod";

import { getImageRemotePatterns } from "@/config/imageRemotePatterns";

// Escapes regex metacharacters in a literal (non-wildcard) glob segment.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches next.config.js's `images.remotePatterns` hostname semantics: a
// single "*" wildcard (e.g. "*.supabase.co") matches one or more characters,
// same as Next/picomatch's non-slash-aware hostname matching.
function hostnameMatches(pattern: string, hostname: string): boolean {
  if (!pattern.includes("*")) return pattern === hostname;
  const regex = pattern.split("*").map(escapeRegExp).join(".+");
  return new RegExp(`^${regex}$`).test(hostname);
}

// Matches next.config.js's `images.remotePatterns` pathname semantics: "**"
// matches any sequence (including "/"), "*" matches any sequence except "/".
function pathnameMatches(pattern: string, pathname: string): boolean {
  let regex = "";
  for (let i = 0; i < pattern.length;) {
    if (pattern.startsWith("**", i)) {
      regex += ".*";
      i += 2;
    } else if (pattern[i] === "*") {
      regex += "[^/]*";
      i += 1;
    } else {
      regex += escapeRegExp(pattern[i]);
      i += 1;
    }
  }
  return new RegExp(`^${regex}$`).test(pathname);
}

function matchesRemotePattern(
  pattern: ReturnType<typeof getImageRemotePatterns>[number],
  url: URL
): boolean {
  if (pattern.protocol !== url.protocol.replace(/:$/, "")) return false;
  if (pattern.port !== undefined && pattern.port !== url.port) return false;
  if (!hostnameMatches(pattern.hostname, url.hostname)) return false;
  return pathnameMatches(pattern.pathname, url.pathname);
}

// Mirrors next.config.js's `images.remotePatterns` (via the shared
// getImageRemotePatterns()) - next/image throws a render-time "hostname is
// not configured" error for any URL that doesn't match protocol, port,
// hostname, *and* pathname there, so an admin-submitted logo URL that only
// happens to share a hostname but not an allowed path would save fine and
// only break the public page when
// rendered.
//
// Computed inside the function, not at module scope: `serverEnv` validates
// lazily on first property access (see env.server.ts) so that `next build`'s
// page-data collection - which imports every route module, including this
// one transitively, without ever using it - doesn't fail on missing secrets.
// Reading `serverEnv.NODE_ENV` at import time here would force that
// validation eagerly and reintroduce the same build failure.
function isAllowedLogoUrl(value: string): boolean {
  const parsed = z.url().safeParse(value);
  if (!parsed.success) return false;

  const url = new URL(value);
  const patterns = getImageRemotePatterns();
  return patterns.some((pattern) => matchesRemotePattern(pattern, url));
}

// App media paths and surviving public assets are valid. The deleted company
// and sponsor asset directories cannot be used for new logo submissions.
export const logoSchema = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      (value.startsWith("/") &&
        !value.startsWith("//") &&
        !/^\/assets\/images\/(companies|sponsors)\//.test(value)) ||
      isAllowedLogoUrl(value),
    {
      message: "Must be an existing app path or a URL from configured storage",
    }
  );
