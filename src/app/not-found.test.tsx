import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Custom404 from "./not-found";

describe("Custom404", () => {
  it("keeps the not-found test id", () => {
    render(<Custom404 />);
    expect(screen.getByTestId("not-found")).toBeTruthy();
  });

  it("links to the home page", () => {
    render(<Custom404 />);
    const link = screen.getByRole("link", { name: "Página inicial" });
    expect(link.getAttribute("href")).toBe("/");
  });
});
