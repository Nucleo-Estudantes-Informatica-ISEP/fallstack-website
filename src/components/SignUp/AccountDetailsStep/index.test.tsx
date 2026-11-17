import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { StudentSignUpData } from "@/types/StudentSignUpData";

import AccountDetailsStep from ".";

const data: StudentSignUpData = {
  name: null,
  email: "1234567@isep.ipp.pt",
  password: null,
  bio: "",
  interests: [],
  cv: null,
  avatar: null,
  year: null,
  course: "Engenharia Informática",
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

test("requires a course independently of the year before proceeding", () => {
  const setCurrentStep = vi.fn();
  function Step() {
    const [value, setValue] = useState<StudentSignUpData>({
      ...data,
      course: "",
    });
    return (
      <AccountDetailsStep
        currentStep={1}
        setCurrentStep={setCurrentStep}
        data={value}
        setData={setValue}
      />
    );
  }
  render(<Step />);

  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "3º Ano Licenciatura" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));
  expect(screen.getByRole("alert")).toHaveTextContent("indica o teu curso");
  expect(setCurrentStep).not.toHaveBeenCalled();

  fireEvent.change(screen.getByRole("textbox", { name: "Curso" }), {
    target: { value: "Engenharia Informática" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));
  expect(setCurrentStep).toHaveBeenCalledWith(2);
});

test("accepts an institutional email independent from AuthNEI", () => {
  const { setData, setCurrentStep } = renderStep(false);
  const email = screen.getByLabelText("Email institucional");
  expect(email).not.toHaveAttribute("readonly");
  fireEvent.change(email, { target: { value: "1234568@isep.ipp.pt" } });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "1º Ano Licenciatura" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));
  expect(setData).toHaveBeenCalledWith(
    expect.objectContaining({ email: "1234568@isep.ipp.pt" })
  );
  expect(setCurrentStep).toHaveBeenCalledWith(1);
});
