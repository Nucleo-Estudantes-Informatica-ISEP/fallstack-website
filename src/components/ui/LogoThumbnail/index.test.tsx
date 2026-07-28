import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import LogoThumbnail from ".";

// The <img> has alt="" (decorative - the row/card next to it already names
// the company), which strips it of an accessible "img" role, so it's
// queried directly rather than via getByRole.
test("renders the logo over a dark chip, not the surrounding card's own background", () => {
  const { container } = render(<LogoThumbnail src="/logo.png" size={40} />);

  const image = container.querySelector("img");
  expect(image).toHaveAttribute("src");

  // The chip, not the <img>, carries the dark background - a light/white
  // logo on a transparent PNG needs this behind it for contrast, since it
  // otherwise sits directly on whatever white card/table the admin
  // backoffice renders it in.
  const chip = image?.parentElement;
  expect(chip).toHaveClass("bg-background");
});

test("sizes the chip and image to the requested size", () => {
  const { container } = render(<LogoThumbnail src="/logo.png" size={64} />);

  const image = container.querySelector("img");
  const chip = image?.parentElement as HTMLElement;

  expect(chip.style.width).toBe("64px");
  expect(chip.style.height).toBe("64px");
});
