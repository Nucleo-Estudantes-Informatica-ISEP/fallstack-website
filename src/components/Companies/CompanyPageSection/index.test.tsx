import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { CompanyDisplayDto } from "@/application/dto/companyDto";

import CompanyPageSection from ".";

vi.mock("@/components/Footer", () => ({ default: () => <footer>NEI</footer> }));

const company: CompanyDisplayDto = {
  id: "company",
  name: "Test Company",
  avatar: "/api/media/logo/test",
  website: "https://example.org",
  rank: { id: "rank", name: "Partner", order: 1, style: null },
  interests: ["Engineering"],
  profile: {
    bodyText: "Company description",
    videoHref: null,
    videoTitle: null,
    facts: [],
    socialLinks: {
      linkedin: "https://linkedin.com/company/test",
      youtube: "https://youtube.com/@test",
    },
  },
};

test("renders DB identity, accessible socials, contact and footer", () => {
  render(<CompanyPageSection company={company} />);
  expect(
    screen.getByRole("heading", { level: 1, name: company.name })
  ).toBeInTheDocument();
  expect(screen.getByAltText(`Logótipo de ${company.name}`)).toHaveAttribute(
    "src",
    company.avatar
  );
  expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    company.profile?.socialLinks.linkedin
  );
  expect(screen.getByRole("link", { name: "YouTube" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Contacto" })).toBeVisible();
  expect(screen.getByText(company.website!)).toHaveAttribute(
    "href",
    company.website
  );
});

test("missing logo uses company name; missing contact has no empty section", () => {
  render(
    <CompanyPageSection company={{ ...company, avatar: null, website: null }} />
  );
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Contacto" })).toBeNull();
  expect(screen.getAllByText(company.name)).toHaveLength(2);
});
