import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { ProfileData } from "@/types/ProfileData";
import { httpClient } from "@/lib/http/client";
import type { StudentDto } from "@/application/dto/studentDto";

import ProfileSection from ".";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/http/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http/client")>()),
  httpClient: { patch: vi.fn().mockResolvedValue({}), post: vi.fn() },
}));

const student: StudentDto = {
  id: "student",
  code: "123",
  name: "Student Example",
  year: "3º Ano Licenciatura",
  course: null,
  user: { email: "1234567@isep.ipp.pt" },
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

test("shows locked fields as read-only with short explanatory hints and readable labels", () => {
  render(<Profile />);

  const nameInput = screen.getByLabelText("Nome");
  expect(nameInput).toHaveAttribute("readonly");
  expect(nameInput).toHaveValue("Student Example");
  expect(nameInput).toHaveAccessibleDescription("Nome definido no registo.");

  const yearInput = screen.getByLabelText("Ano");
  expect(yearInput).toHaveAttribute("readonly");
  expect(yearInput).toHaveValue("3º Ano Licenciatura");
  expect(yearInput).toHaveAccessibleDescription("Definido no registo.");

  const emailInput = screen.getByLabelText("Email institucional");
  expect(emailInput).not.toHaveAttribute("readonly");
  expect(emailInput).toHaveValue("1234567@isep.ipp.pt");
  expect(emailInput).toHaveAccessibleDescription(
    "Email do ISEP para o teu perfil."
  );

  // Editable fields have readable labels
  expect(screen.getByLabelText("LinkedIn")).not.toBeDisabled();
  expect(screen.getByLabelText("GitHub")).not.toBeDisabled();
  expect(screen.getByLabelText("CV")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Biografia" })).not.toBeDisabled();
});

test("has the shared section heading, not Coolvetica", () => {
  render(<Profile />);

  const heading = screen.getByRole("heading", { name: "Informações pessoais" });
  expect(heading.tagName).toBe("H2");
  expect(heading).toHaveClass(
    "font-sans",
    "font-semibold",
    "text-2xl",
    "lg:text-[1.75rem]",
    "text-center",
    "lg:text-left"
  );
});

test("Guardar still saves the profile through the same request", async () => {
  render(<Profile />);

  fireEvent.change(screen.getByRole("textbox", { name: "Biografia" }), {
    target: { value: "Nova bio" },
  });
  fireEvent.click(screen.getByRole("button", { name: "React" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(httpClient.patch).toHaveBeenCalledWith("/students/123", {
      bio: "Nova bio",
      github: "",
      linkedin: "",
      interests: ["react"],
      institutionalEmail: "1234567@isep.ipp.pt",
    })
  );
});

test("saves edited institutional email with the profile", async () => {
  render(<Profile />);
  fireEvent.change(screen.getByLabelText("Email institucional"), {
    target: { value: "1234568@isep.ipp.pt" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(httpClient.patch).toHaveBeenCalledWith(
      "/students/123",
      expect.objectContaining({ institutionalEmail: "1234568@isep.ipp.pt" })
    )
  );
});

test("saves an edited course in the profile request", async () => {
  render(<Profile />);
  const course = screen.getByLabelText("Curso");
  expect(course).not.toHaveAttribute("readonly");
  fireEvent.change(course, { target: { value: "  Engenharia Informática  " } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(httpClient.patch).toHaveBeenCalledWith(
      "/students/123",
      expect.objectContaining({ course: "Engenharia Informática" })
    )
  );
});
