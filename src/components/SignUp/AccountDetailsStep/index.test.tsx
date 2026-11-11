import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { StudentSignUpData } from "@/types/StudentSignUpData";

import AccountDetailsStep from ".";

const data: StudentSignUpData = {
  name: null,
  email: null,
  password: null,
  bio: "",
  interests: [],
  cv: null,
  avatar: null,
  year: null,
  linkedin: null,
};

function renderStep(needsName: boolean) {
  const setData = vi.fn();
  const setCurrentStep = vi.fn();
  render(
    <AccountDetailsStep
      currentStep={0}
      setCurrentStep={setCurrentStep}
      data={data}
      setData={setData}
      institutionalEmail="student@example.test"
      needsName={needsName}
    />
  );
  return { setData, setCurrentStep };
}

test("does not ask for a name when AuthNEI provided one", () => {
  renderStep(false);
  expect(screen.queryByLabelText("Nome")).toBeNull();
});

test("requires a name before continuing when AuthNEI has none", () => {
  const { setData, setCurrentStep } = renderStep(true);

  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "1º Ano Licenciatura" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));

  expect(screen.getByRole("alert")).toHaveTextContent("indica o teu nome");
  expect(setCurrentStep).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "  Maria Silva " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));

  expect(setData).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Maria Silva",
      year: "1º Ano Licenciatura",
    })
  );
  expect(setCurrentStep).toHaveBeenCalledWith(1);
});
