// Leading "magic bytes" for the file types we accept on upload. When bytes
// reach the server this validates their declared type before storage. The
// browser repeats the check for quick feedback.
const SIGNATURES: Record<string, { offset: number; bytes: number[] }[]> = {
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  "image/webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
  ],
  "application/pdf": [
    { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  ],
};

/** True if the file's leading bytes match its declared MIME type. */
export function matchesDeclaredType(
  bytes: Uint8Array,
  contentType: string
): boolean {
  const signatures = SIGNATURES[contentType];
  if (!signatures) return false; // unknown/unsupported type
  return signatures.every(({ offset, bytes: signature }) =>
    signature.every((byte, i) => bytes[offset + i] === byte)
  );
}
