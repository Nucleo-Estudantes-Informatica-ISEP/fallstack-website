import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import CompanyInfo from ".";

const path = "/api/media/video/12345678-1234-1234-1234-123456789abc";
test("renders uploaded MP4 with controls and without autoplay", () => {
  render(
    <CompanyInfo
      bodyText="Profile"
      videoHref={path}
      videoTitle="Career video"
      showsPromoVideo
    />
  );
  const video = screen.getByLabelText("Career video");
  expect(video.tagName).toBe("VIDEO");
  expect(video).toHaveAttribute("controls");
  expect(video).toHaveAttribute("preload", "metadata");
  expect(video).toHaveAttribute("src", path);
  expect(video).not.toHaveAttribute("autoplay");
});
test("keeps YouTube playback and suppresses unsupported or disabled video", () => {
  const { container, rerender } = render(
    <CompanyInfo
      bodyText="Profile"
      videoHref="https://youtu.be/-GidmadVPbM"
      videoTitle="YouTube"
      showsPromoVideo
    />
  );
  expect(screen.getByTitle("YouTube")).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/-GidmadVPbM"
  );
  rerender(
    <CompanyInfo
      bodyText="Profile"
      videoHref={path}
      videoTitle="Disabled"
      showsPromoVideo={false}
    />
  );
  expect(container.querySelector("video,iframe")).toBeNull();
  rerender(
    <CompanyInfo
      bodyText="Profile"
      videoHref="https://evil.test/file.mp4"
      videoTitle="Invalid"
      showsPromoVideo
    />
  );
  expect(container.querySelector("video,iframe")).toBeNull();
});
