// Reject characters that URL parsing can strip or interpret as separators.
export function sanitizeNext(next?: string | null): string {
  if (
    !next ||
    /[\\\t\n\r]/u.test(next) ||
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
