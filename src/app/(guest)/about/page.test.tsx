import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { branding } from "@/edition/branding";

import About from "./page";

describe("About page", () => {
  it("keeps the NEI link", () => {
    render(<About />);
    const link = screen.getByRole("link", { name: "NEI-ISEP" });
    expect(link.getAttribute("href")).toBe("https://nei.isep.ipp.pt/");
  });

  it("keeps the repository link", () => {
    render(<About />);
    const link = screen.getByRole("link", { name: branding.repositoryUrl });
    expect(link.getAttribute("href")).toBe(branding.repositoryUrl);
  });

  it("keeps the support email link", () => {
    render(<About />);
    const link = screen.getByRole("link", { name: "support@nei-isep.org" });
    expect(link.getAttribute("href")).toBe("mailto:support@nei-isep.org");
  });
});
