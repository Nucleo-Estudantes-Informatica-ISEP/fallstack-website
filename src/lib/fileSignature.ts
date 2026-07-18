// Leading "magic bytes" for the file types we accept on upload.
// `file.type` is a client-supplied label and trivially spoofable; these
// signatures let us confirm the bytes actually match the declared type.
const SIGNATURES: Record<string, number[][]> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47]], // ‰PNG
  "image/jpeg": [[0xff, 0xd8, 0xff]], //      ÿØÿ
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
