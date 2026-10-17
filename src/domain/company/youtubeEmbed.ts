/**
 * YouTube Embed URL normalization and validation.
 *
 * Enforces that company video embeds strictly use canonical YouTube embed URLs
 * (`https://www.youtube.com/embed/<id>`), compatible with CSP frame-src.
 */

// YouTube video IDs are 11 characters long, consisting of alphanumeric chars, underscores, and dashes.
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts the 11-character video ID from various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function parseYouTubeVideoId(
  url: string | null | undefined
): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    // youtu.be/VIDEO_ID
    if (hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0]?.split("?")[0];
      return id && YOUTUBE_ID_REGEX.test(id) ? id : null;
    }

    // Standard YouTube domains
    const isYouTubeDomain =
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube-nocookie.com" ||
      hostname === "www.youtube-nocookie.com";

    if (!isYouTubeDomain) {
      return null;
    }

    // /watch?v=VIDEO_ID
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id && YOUTUBE_ID_REGEX.test(id) ? id : null;
    }

    // /embed/VIDEO_ID, /v/VIDEO_ID, or /shorts/VIDEO_ID
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (
      pathParts.length >= 2 &&
      (pathParts[0] === "embed" ||
        pathParts[0] === "v" ||
        pathParts[0] === "shorts")
    ) {
      const id = pathParts[1];
      return id && YOUTUBE_ID_REGEX.test(id) ? id : null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Normalizes any supported YouTube video URL to canonical embed format:
 * `https://www.youtube.com/embed/${videoId}`
 */
export function normalizeYouTubeEmbedUrl(
  url: string | null | undefined
): string | null {
  const id = parseYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
