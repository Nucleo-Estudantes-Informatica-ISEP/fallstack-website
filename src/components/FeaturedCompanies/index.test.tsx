import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import type { CompanyRosterDto } from "@/application/dto/companyDto";
import { Language } from "@/domain/i18n/translations";

import FeaturedCompanies from ".";

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

test.each([1, 3, 5])(
  "renders all %s featured partners with bounded logos and tier links",
  (count) => {
    const companies = [
      ...Array.from({ length: count }, (_, i) => company(i)),
      company(99, false),
    ];
    render(<FeaturedCompanies language={Language.PT} companies={companies} />);
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

test("uses rank flag, orders ranks/companies, reuses internal links and keeps missing-logo names", () => {
  const internal = company(2);
  internal.rank.style!.hasInternalPage = true;
  const noLogo = company(1);
  noLogo.avatar = null;
  const earlierRank = company(3);
  earlierRank.rank = { ...earlierRank.rank, order: -1 };
  render(
    <FeaturedCompanies
      language={Language.EN}
      companies={[internal, noLogo, earlierRank]}
    />
  );
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
  (companies) => {
    const { container } = render(
      <FeaturedCompanies language={Language.PT} companies={companies} />
    );
    expect(container.firstChild).toBeNull();
  }
);
