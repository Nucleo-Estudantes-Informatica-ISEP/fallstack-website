import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import CompanyImage from "@/components/Companies/CompanyProfile/CompanyImage";

test("renders the company logo URL without a static fallback", () => {
  const logoUrl =
    "https://demo.supabase.co/storage/v1/object/public/logos/company.png";

  render(
    <CompanyImage
      company={{ id: "company-1", name: "Company", avatar: logoUrl }}
    />
  );

  expect(screen.getByRole("img", { name: "Company logo" })).toHaveAttribute(
    "src",
    expect.stringContaining(encodeURIComponent(logoUrl))
  );
});

test("renders no image when the company has no stored logo", () => {
  const { container } = render(
    <CompanyImage
      company={{ id: "company-1", name: "Company", avatar: null }}
    />
  );

  expect(container).toBeEmptyDOMElement();
});
