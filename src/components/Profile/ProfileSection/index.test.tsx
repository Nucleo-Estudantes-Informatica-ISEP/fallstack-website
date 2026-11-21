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

function Profile({ legacyLinks = false }: { legacyLinks?: boolean }) {
  const [profile, setProfile] = useState<ProfileData>({
    bio: student.bio,
    interests: [],
    cv: null,
    linkedin: legacyLinks ? "http://linkedin.com/in/legacy" : null,
    github: legacyLinks ? "http://github.com/legacy" : null,
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

test("shows editable and locked fields with readable labels", () => {
  render(<Profile />);

  const nameInput = screen.getByLabelText("Nome");
  expect(nameInput).not.toHaveAttribute("readonly");
  expect(nameInput).toHaveValue("Student Example");

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

test("Guardar saves profile changes and preserves untouched legacy links", async () => {
  render(<Profile legacyLinks />);
  expect(screen.getByLabelText("LinkedIn")).toHaveValue(
    "http://linkedin.com/in/legacy"
  );
  expect(screen.getByLabelText("GitHub")).toHaveValue(
    "http://github.com/legacy"
  );

  fireEvent.change(screen.getByRole("textbox", { name: "Biografia" }), {
    target: { value: "Nova bio" },
  });
  fireEvent.click(screen.getByRole("button", { name: "React" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(httpClient.patch).toHaveBeenCalledWith("/students/123", {
      name: "Student Example",
      bio: "Nova bio",
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

test("saves an edited name with the profile", async () => {
  render(<Profile />);
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "  New Name  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(httpClient.patch).toHaveBeenCalledWith(
      "/students/123",
      expect.objectContaining({ name: "New Name" })
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

test.each(["https://www.github.com/student", ""])(
  "saves a GitHub link accepted by the server schema (%j)",
  async (github) => {
    vi.mocked(httpClient.patch).mockClear();
    render(<Profile legacyLinks />);
    fireEvent.change(screen.getByLabelText("GitHub"), {
      target: { value: github },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(httpClient.patch).toHaveBeenCalledWith(
        "/students/123",
        expect.objectContaining({ github })
      )
    );
  }
);

test("does not submit a GitHub URL with a different hostname", () => {
  vi.mocked(httpClient.patch).mockClear();
  render(<Profile />);
  fireEvent.change(screen.getByLabelText("GitHub"), {
    target: { value: "https://example.invalid/student" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect(httpClient.patch).not.toHaveBeenCalled();
});
