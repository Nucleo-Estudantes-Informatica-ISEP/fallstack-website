import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { CompanyRosterDto } from "@/application/dto/companyDto";
import { getPublicCompanyRoster } from "@/application/services/publicEditionService";
import { Language } from "@/domain/i18n/translations";

import FeaturedCompanies from ".";

vi.mock("@/application/services/publicEditionService", () => ({
  getPublicCompanyRoster: vi.fn(),
  readHomepageSection: (read: Promise<unknown>) => read.catch(() => []),
}));

const company = (id: number, isFeatured = true): CompanyRosterDto => ({
  id: String(id),
  name: `Partner ${id}`,
  avatar: `/logo-${id}.png`,
  website: `https://partner-${id}.example`,
  order: id,
  rank: {
    id: "rank",
    name: "Any rank",
    order: 0,
    style: {
      gradientFromColor: "#fff",
      gradientFromStop: "0%",
      gradientToColor: "#fff",
      gradientToStop: "100%",
      hasInternalPage: false,
      showsPromoVideo: false,
      isFeatured,
    },
  },
  logoWidth: 9000,
  logoHeight: 9000,
  className: "w-full",
  hasContent: true,
  interests: [],
});

beforeEach(() => vi.clearAllMocks());

test.each([1, 3, 5])(
  "renders all %s featured partners with bounded logos and tier links",
  async (count) => {
    vi.mocked(getPublicCompanyRoster).mockResolvedValue([
      ...Array.from({ length: count }, (_, i) => company(i)),
      company(99, false),
    ]);
    render(await FeaturedCompanies({ language: Language.PT }));
    expect(screen.getAllByRole("img")).toHaveLength(count);
    expect(screen.queryByRole("img", { name: "Partner 99" })).toBeNull();
    expect(screen.getByRole("link", { name: "Partner 0" })).toHaveAttribute(
      "href",
      "https://partner-0.example"
    );
    expect(screen.getByRole("img", { name: "Partner 0" })).toHaveAttribute(
      "width",
      "120"
    );
  }
);

test("uses rank flag, orders ranks/companies, reuses internal links and keeps missing-logo names", async () => {
  const internal = company(2);
  internal.rank.style!.hasInternalPage = true;
  const noLogo = company(1);
  noLogo.avatar = null;
  const earlierRank = company(3);
  earlierRank.rank = { ...earlierRank.rank, order: -1 };
  vi.mocked(getPublicCompanyRoster).mockResolvedValue([
    internal,
    noLogo,
    earlierRank,
  ]);
  render(await FeaturedCompanies({ language: Language.EN }));
  expect(
    screen.getByRole("region", { name: "Featured partners" })
  ).toBeInTheDocument();
  expect(
    screen
      .getAllByRole("link")
      .map((link) => link.textContent || link.querySelector("img")?.alt)
  ).toEqual(["Partner 3", "Partner 1", "Partner 2"]);
  expect(screen.getByRole("link", { name: "Partner 2" })).toHaveAttribute(
    "href",
    "/company/Partner%202"
  );
  expect(screen.getByText("Partner 1")).toBeInTheDocument();
});

test.each([[[]], [[company(1, false)]]])(
  "omits empty featured rows",
  async (companies) => {
    vi.mocked(getPublicCompanyRoster).mockResolvedValue(companies);
    expect(await FeaturedCompanies({ language: Language.PT })).toBeNull();
  }
);

test("company-data outage leaves landing available", async () => {
  vi.mocked(getPublicCompanyRoster).mockRejectedValue(new Error("DB offline"));
  expect(await FeaturedCompanies({ language: Language.PT })).toBeNull();
});
