import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { StudentSignUpData } from "@/types/StudentSignUpData";

import InterestsStep from ".";

const data = { interests: [] } as unknown as StudentSignUpData;

test("signup interests step uses the shared centred selector and keeps the selection", () => {
  const setData = vi.fn();
  const setCurrentStep = vi.fn();

  render(
    <InterestsStep
      currentStep={2}
      setCurrentStep={setCurrentStep}
      data={data}
      setData={setData}
      availableInterests={[
        { id: "typescript", name: "TypeScript" },
        { id: "react", name: "React" },
      ]}
    />
  );

  const tag = screen.getByRole("button", { name: "React", pressed: false });
  expect(tag.parentElement).toHaveClass("flex-wrap", "justify-center");

  fireEvent.click(tag);
  expect(
    screen
      .getByRole("button", { name: "React", pressed: true })
      .querySelector("svg")
  ).toHaveAttribute("aria-hidden", "true");

  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));
  expect(setData).toHaveBeenCalledWith({ ...data, interests: ["react"] });
  expect(setCurrentStep).toHaveBeenCalledWith(3);
});
