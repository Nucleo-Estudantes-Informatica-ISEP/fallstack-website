import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Company from ".";

vi.mock("next/image", () => ({
  default: ({
    fill,
    unoptimized,
    alt,
    ...props
  }: {
    fill?: boolean;
    unoptimized?: boolean;
    alt: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={alt} data-fill={fill} data-unoptimized={unoptimized} />
  ),
}));

test("uploaded logos ignore company size and class overrides", () => {
  render(
    <Company
      name="Partner"
      logoHref="/logo.png"
      hasContent={false}
      rankStyle={null}
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

test("long names stay within logo-less cells", () => {
  const name =
    "A very long company name that would otherwise overflow its cell";
  render(<Company name={name} hasContent={false} rankStyle={null} />);
  expect(screen.getByText(name)).toHaveClass("line-clamp-2", "text-center");
});

test("uploaded SVG logos bypass image optimization without changing sizing", () => {
  render(
    <Company
      name="SVG partner"
      logoHref="/api/media/logo/partner.svg"
      hasContent={false}
      rankStyle={null}
    />
  );
  const logo = screen.getByRole("img", { name: "SVG partner" });
  expect(logo).toHaveAttribute("data-unoptimized", "true");
  expect(logo).toHaveClass("object-contain");
});
