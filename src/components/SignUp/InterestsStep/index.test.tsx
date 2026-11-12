import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { StudentSignUpData } from "@/types/StudentSignUpData";

import InterestsStep from ".";

const data = { interests: [] } as unknown as StudentSignUpData;

test("signup interests wrap from the left and retain the selection", () => {
  const setCurrentStep = vi.fn();

  function Step() {
    const [draft, setData] = useState(data);
    return (
      <InterestsStep
        currentStep={2}
        setCurrentStep={setCurrentStep}
        data={draft}
        setData={setData}
        availableInterests={[
          { id: "typescript", name: "TypeScript" },
          { id: "react", name: "React" },
        ]}
      />
    );
  }

  render(<Step />);

  const tag = screen.getByRole("button", { name: "React", pressed: false });
  expect(tag.parentElement).toHaveClass("flex-wrap", "justify-start");

  fireEvent.click(tag);
  expect(
    screen
      .getByRole("button", { name: "React", pressed: true })
      .querySelector("svg")
  ).toHaveAttribute("aria-hidden", "true");

  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));
  expect(setCurrentStep).toHaveBeenCalledWith(3);
});
