import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import InterestSelector from ".";

test("renders server-provided interests and updates selection", () => {
  const setSelectedInterestIds = vi.fn();

  render(
    <InterestSelector
      availableInterests={[
        { id: "typescript", name: "TypeScript" },
        { id: "react", name: "React" },
      ]}
      selectedInterestIds={["typescript"]}
      setSelectedInterestIds={setSelectedInterestIds}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "React" }));

  expect(setSelectedInterestIds).toHaveBeenCalledWith(["typescript", "react"]);
});

test("centres the wrapping tags, including the last row", () => {
  render(
    <InterestSelector
      availableInterests={[
        { id: "typescript", name: "TypeScript" },
        { id: "react", name: "React" },
      ]}
      selectedInterestIds={[]}
      setSelectedInterestIds={vi.fn()}
    />
  );

  const container = screen.getByRole("button", { name: "React" })
    .parentElement as HTMLElement;

  expect(container).toHaveClass("flex", "flex-wrap", "justify-center");
});

test("renders outlined pill tags with legible unselected text", () => {
  render(
    <InterestSelector
      availableInterests={[
        { id: "typescript", name: "TypeScript" },
        { id: "react", name: "React" },
      ]}
      selectedInterestIds={["typescript"]}
      setSelectedInterestIds={vi.fn()}
    />
  );

  const unselected = screen.getByRole("button", {
    name: "React",
    pressed: false,
  });
  const selected = screen.getByRole("button", {
    name: "TypeScript",
    pressed: true,
  });

  expect(unselected).toHaveClass("rounded-full", "border", "text-white/80");
  expect(unselected).not.toHaveClass("text-white/60");
  expect(selected).toHaveClass("rounded-full", "border", "text-white");
});

test("marks selected tags with a check icon, not by colour alone", () => {
  render(
    <InterestSelector
      availableInterests={[
        { id: "typescript", name: "TypeScript" },
        { id: "react", name: "React" },
      ]}
      selectedInterestIds={["typescript"]}
      setSelectedInterestIds={vi.fn()}
    />
  );

  const selected = screen.getByRole("button", {
    name: "TypeScript",
    pressed: true,
  });
  const unselected = screen.getByRole("button", {
    name: "React",
    pressed: false,
  });

  expect(selected.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(unselected.querySelector("svg")).toBeNull();
});
