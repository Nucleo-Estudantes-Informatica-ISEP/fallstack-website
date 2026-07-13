import { render, screen } from "@testing-library/react";
import HeadingText from "~/src/components/HeadingText";
import { expect, test } from "vitest";

test("renders an accessible heading", () => {
  render(<HeadingText text="Fallstack" />);

  expect(
    screen.getByRole("heading", { name: "Fallstack" })
  ).toBeInTheDocument();
});
