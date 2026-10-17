import { describe, expect, it } from "vitest";

import { normalizeYouTubeEmbedUrl, parseYouTubeVideoId } from "./youtubeEmbed";

describe("YouTube URL parsing and normalization", () => {
  const VIDEO_ID = "dQw4w9WgXcQ";

  const validUrls = [
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com/watch?v=${VIDEO_ID}&feature=share`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}?t=10`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
    `https://youtube.com/embed/${VIDEO_ID}?autoplay=1`,
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    `https://youtube-nocookie.com/embed/${VIDEO_ID}`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/v/${VIDEO_ID}`,
  ];

  it.each(validUrls)("extracts video ID from %s", (url) => {
    expect(parseYouTubeVideoId(url)).toBe(VIDEO_ID);
  });

  it.each(validUrls)("normalizes %s to canonical embed URL", (url) => {
    expect(normalizeYouTubeEmbedUrl(url)).toBe(
      `https://www.youtube.com/embed/${VIDEO_ID}`
    );
  });

  it("handles null, undefined, and empty string gracefully", () => {
    expect(parseYouTubeVideoId(null)).toBeNull();
    expect(parseYouTubeVideoId(undefined)).toBeNull();
    expect(parseYouTubeVideoId("")).toBeNull();
    expect(parseYouTubeVideoId("   ")).toBeNull();

    expect(normalizeYouTubeEmbedUrl(null)).toBeNull();
    expect(normalizeYouTubeEmbedUrl(undefined)).toBeNull();
    expect(normalizeYouTubeEmbedUrl("")).toBeNull();
  });

  it("rejects non-YouTube URLs or invalid video IDs", () => {
    expect(parseYouTubeVideoId("https://vimeo.com/12345678")).toBeNull();
    expect(parseYouTubeVideoId("https://example.com/video")).toBeNull();
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?v=short")
    ).toBeNull();
    expect(
      parseYouTubeVideoId(
        "https://www.youtube.com/watch?v=waytoolongvideoid1234"
      )
    ).toBeNull();
    expect(parseYouTubeVideoId("not-a-url")).toBeNull();

    expect(normalizeYouTubeEmbedUrl("https://vimeo.com/12345678")).toBeNull();
  });
});
