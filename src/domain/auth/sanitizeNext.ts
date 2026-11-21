// `next` is attacker-controlled query input — only allow redirecting back
// into this app, never to an external host. Backslashes are rejected
// outright: WHATWG URL parsing normalizes a leading `/\` to `//` for
// http(s) URLs, so `/\evil.com` would otherwise pass the `//` check here
// and still resolve to an external host once handed to `new URL(...)`.
export function sanitizeNext(next: string | null): string {
  if (
    !next ||
    next.includes("\\") ||
    !next.startsWith("/") ||
    next.startsWith("//")
  )
    return "/";
  const base = "https://fallstack.invalid";
  try {
    const destination = new URL(next, base);
    if (
      destination.origin === base &&
      !/^\/(?:\/|%2f|%5c)/i.test(destination.pathname)
    ) {
      return destination.pathname + destination.search + destination.hash;
    }
  } catch {
    // An invalid callback must stay inside the app.
  }
  return "/";
}
