import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Company from ".";

vi.mock("next/image", () => ({
  default: ({ fill, alt, ...props }: { fill?: boolean; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={alt} data-fill={fill} />
  ),
}));

test("uploaded logos ignore company size and class overrides", () => {
  render(
    <Company
      name="Partner"
      logoHref="/logo.png"
      hasContent={false}
      rankStyle={null}
      logoWidth={9000}
      logoHeight={9000}
      className="w-screen scale-200"
      divClassName="h-screen"
    />
  );
  const logo = screen.getByRole("img", { name: "Partner" });
  expect(logo).toHaveClass("object-contain");
  expect(logo).not.toHaveAttribute("width");
  expect(logo).not.toHaveAttribute("height");
  expect(logo).not.toHaveClass("w-screen", "scale-200");
  expect(logo.closest("a")).toHaveClass("max-w-40");
  expect(logo.closest("a")?.parentElement).not.toHaveClass("h-screen");
});
