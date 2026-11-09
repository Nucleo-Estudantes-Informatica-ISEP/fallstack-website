import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { ProfileData } from "@/types/ProfileData";
import type { StudentDto } from "@/application/dto/studentDto";

import ProfileSection from ".";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const student: StudentDto = {
  id: "student",
  code: "123",
  name: "Student Example",
  year: "3º Ano Licenciatura",
  user: { email: "student@example.test" },
  bio: "Hello",
  cv: null,
  cvPurgedAt: null,
  linkedin: null,
  github: null,
  avatar: null,
};

function Profile() {
  const [profile, setProfile] = useState<ProfileData>({
    bio: student.bio,
    interests: [],
    cv: null,
    linkedin: null,
    github: null,
    avatar: null,
  });
  return (
    <ProfileSection
      student={student}
      profile={profile}
      setProfile={setProfile}
      setActiveTab={vi.fn()}
      availableInterests={[{ id: "react", name: "React" }]}
    />
  );
}

test("labels biography, shows one live counter and exposes interest selection", () => {
  render(<Profile />);
  expect(screen.getAllByText(/\/ 255 caracteres/)).toHaveLength(1);
  fireEvent.change(screen.getByRole("textbox", { name: "Biografia" }), {
    target: { value: "Updated bio" },
  });
  expect(screen.getByText("11 / 255 caracteres")).toBeInTheDocument();
  const interest = screen.getByRole("button", {
    name: "React",
    pressed: false,
  });
  fireEvent.click(interest);
  expect(interest).toHaveAttribute("aria-pressed", "true");
});

test("shows locked fields as disabled with short explanatory hints and readable labels", () => {
  render(<Profile />);

  const nameInput = screen.getByLabelText("Nome");
  expect(nameInput).toBeDisabled();
  expect(nameInput).toHaveValue("Student Example");
  expect(
    screen.getByText(
      "Definido pela tua conta institucional e não pode ser alterado."
    )
  ).toBeInTheDocument();

  const yearInput = screen.getByLabelText("Ano");
  expect(yearInput).toBeDisabled();
  expect(yearInput).toHaveValue("3º Ano Licenciatura");
  expect(
    screen.getByText("Definido no registo da conta e não pode ser alterado.")
  ).toBeInTheDocument();

  const emailInput = screen.getByLabelText("Email");
  expect(emailInput).toBeDisabled();
  expect(emailInput).toHaveValue("student@example.test");
  expect(
    screen.getByText(
      "Associado à tua conta institucional e não pode ser alterado."
    )
  ).toBeInTheDocument();

  // Editable fields have readable labels
  expect(screen.getByLabelText("LinkedIn")).not.toBeDisabled();
  expect(screen.getByLabelText("GitHub")).not.toBeDisabled();
  expect(screen.getByLabelText("CV")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Biografia" })).not.toBeDisabled();
});
