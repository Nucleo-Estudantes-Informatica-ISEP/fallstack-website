import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Language } from "@/domain/i18n/translations";

import CompaniesSection from ".";

vi.mock("@/lib/http/client", () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue([
      {
        id: "company-1",
        name: "No Logo Ltd",
        avatar: null,
        website: "https://example.com",
        hasContent: false,
        rank: { id: "rank-1", name: "Gold", order: 0, style: null },
      },
    ]),
  },
}));

test("active company without a logo stays visible in the roster", async () => {
  render(<CompaniesSection language={Language.PT} />);
  expect(await screen.findByText("No Logo Ltd")).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: "No Logo Ltd" })).toBeNull();
});
