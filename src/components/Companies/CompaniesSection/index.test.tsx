import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import CompaniesSection from ".";

test("active company without a logo stays visible in the initial roster", () => {
  render(
    <CompaniesSection
      companies={[
        {
          id: "company-1",
          name: "No Logo Ltd",
          avatar: null,
          website: "https://example.com",
          hasContent: false,
          order: 0,
          rank: { id: "rank-1", name: "Gold", order: 0, style: null },
          logoWidth: null,
          logoHeight: null,
          className: null,
          interests: [],
        },
      ]}
    />
  );
  expect(screen.getByText("No Logo Ltd")).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: "No Logo Ltd" })).toBeNull();
});
