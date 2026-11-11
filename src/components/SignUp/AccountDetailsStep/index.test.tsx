import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { StudentSignUpData } from "@/types/StudentSignUpData";

import AccountDetailsStep from ".";

vi.mock("@/components/AuthNeiButton", () => ({ default: () => null }));

test("requires a course independently of the year before proceeding", () => {
  const next = vi.fn();
  function Step() {
    const [data, setData] = useState({
      year: null,
      course: "",
    } as StudentSignUpData);
    return (
      <AccountDetailsStep
        currentStep={1}
        setCurrentStep={next}
        data={data}
        setData={setData}
        authNeiMode
      />
    );
  }
  render(<Step />);
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "3º Ano Licenciatura" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));
  expect(
    screen.getByText("Por favor, indica o teu curso.")
  ).toBeInTheDocument();
  expect(next).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox", { name: "Curso" }), {
    target: { value: "Engenharia Informática" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Seguinte" }));
  expect(next).toHaveBeenCalledWith(2);
});
