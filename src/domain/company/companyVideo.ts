// Uploaded videos use app-owned paths; external files and encoded aliases are rejected.
const videoPath =
  /^\/api\/media\/video\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export const companyVideoId = (value: string | null | undefined) =>
  value?.match(videoPath)?.[1] ?? null;

export const videoKey = (id: string) => `distribution/video/${id}.mp4`;
export const videoUrl = (id: string) => `/api/media/video/${id}`;
export const MAX_VIDEO_BYTES = 256 * 1024 * 1024;

export function isMp4Header(bytes: Uint8Array) {
  if (bytes.length < 16) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxSize = view.getUint32(0);
  const text = (offset: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (text(4) !== "ftyp" || boxSize < 16 || boxSize > bytes.length)
    return false;
  const brands = new Set([
    "isom",
    "iso2",
    "iso3",
    "iso4",
    "iso5",
    "iso6",
    "mp41",
    "mp42",
    "avc1",
    "M4V ",
  ]);
  if (brands.has(text(8))) return true;
  for (let i = 16; i + 4 <= boxSize; i += 4)
    if (brands.has(text(i))) return true;
  return false;
}
