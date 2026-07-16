import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import HeadingText from "@/components/HeadingText";

test("renders an accessible heading", () => {
  render(<HeadingText text="Fallstack" />);

  expect(
    screen.getByRole("heading", { name: "Fallstack" })
  ).toBeInTheDocument();
});
