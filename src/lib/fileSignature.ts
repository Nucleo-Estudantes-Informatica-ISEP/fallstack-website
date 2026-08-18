// Leading "magic bytes" for the file types we accept on upload. When bytes
// reach the server this validates their declared type. For signed direct
// uploads it is an early browser-side check only; Storage bucket restrictions
// are the enforcement boundary.
const SIGNATURES: Record<string, number[][]> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

/** True if the file's leading bytes match its declared MIME type. */
export function matchesDeclaredType(
  bytes: Uint8Array,
  contentType: string
): boolean {
  const signatures = SIGNATURES[contentType];
  if (!signatures) return false; // unknown/unsupported type
  return signatures.some((sig) => sig.every((byte, i) => bytes[i] === byte));
}
