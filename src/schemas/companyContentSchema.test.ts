import { describe, expect, it } from "vitest";

import {
  updateCompanyProfileSchema,
  youtubeEmbedUrlSchema,
} from "./companyContentSchema";

describe("youtubeEmbedUrlSchema", () => {
  it("normalizes YouTube watch and short links into embed format", () => {
    const watch = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(youtubeEmbedUrlSchema.parse(watch)).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );

    const share = "https://youtu.be/dQw4w9WgXcQ";
    expect(youtubeEmbedUrlSchema.parse(share)).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );

    const nocookie = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    expect(youtubeEmbedUrlSchema.parse(nocookie)).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
  });

  it("handles null, empty string, and undefined", () => {
    expect(youtubeEmbedUrlSchema.parse(null)).toBeNull();
    expect(youtubeEmbedUrlSchema.parse("")).toBeNull();
    expect(youtubeEmbedUrlSchema.parse(undefined)).toBeUndefined();
  });

  it("rejects non-YouTube or invalid URLs", () => {
    expect(() =>
      youtubeEmbedUrlSchema.parse("https://vimeo.com/123456")
    ).toThrow();
    expect(() => youtubeEmbedUrlSchema.parse("invalid-url")).toThrow();
  });
});

describe("updateCompanyProfileSchema", () => {
  it("normalizes videoHref when saving company profile", () => {
    const result = updateCompanyProfileSchema.parse({
      bodyText: "About us",
      videoHref: "https://youtu.be/dQw4w9WgXcQ",
    });

    expect(result.videoHref).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("accepts null or missing videoHref", () => {
    const result = updateCompanyProfileSchema.parse({
      bodyText: "About us",
      videoHref: null,
    });
    expect(result.videoHref).toBeNull();
  });
});
