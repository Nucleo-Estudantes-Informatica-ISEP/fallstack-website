// Markers from a previous deployment lack an issue timestamp.
export function parseOidcRestartMarker(value: string | undefined) {
  const match = value?.match(/^stored:(?:(\d{13}):)?([A-Za-z0-9_-]{43})$/u);
  return match && { issuedAt: Number(match[1] ?? 0), token: match[2] };
}
