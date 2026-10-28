import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { ProfileData } from "@/types/ProfileData";
import type { StudentDto } from "@/application/dto/studentDto";

import ProfileSection from ".";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/Profile/UserImage", () => ({ default: () => null }));
vi.mock("@/components/Profile/AvatarCropper", () => ({ default: () => null }));

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
