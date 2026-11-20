// Reject characters that URL parsing can strip or interpret as separators.
export function sanitizeNext(next?: string | null): string {
  if (
    !next ||
    /[\\\t\n\r]/u.test(next) ||
    !next.startsWith("/") ||
    next.startsWith("//")
  )
    return "/";
  return next;
}
