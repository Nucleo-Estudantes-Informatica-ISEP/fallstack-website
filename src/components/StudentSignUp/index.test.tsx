import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import StudentSignUp from ".";
import { readStudentDraft, saveStudentDraft } from "./draft";

vi.mock("@/components/SignUp/AccountDetailsStep", () => ({
  default: ({ data }: { data: { email: string | null } }) => (
    <p>{data.email ?? "Email por indicar"}</p>
  ),
}));
vi.mock("@/components/SignUp/BioStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/InterestsStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/FinalStep", () => ({
  default: ({ onProfileCreated }: { onProfileCreated: () => void }) => (
    <button onClick={onProfileCreated}>Complete profile</button>
  ),
}));

beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

test("starts with an explicit contact email independent from login", () => {
  render(<StudentSignUp accountId="student-one" interests={[]} />);

  expect(screen.getByText("Email por indicar")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
});

test("restores another visit for its owner and removes the draft after completion", () => {
  saveStudentDraft("student-one", 3, {
    name: "Student",
    email: "student@isep.ipp.pt",
    bio: "Draft",
    interests: [],
    year: null,
    linkedin: null,
    password: "must-not-be-saved",
    avatar: "blob:one",
    cv: {
      name: "cv.pdf",
      file: new File(["cv"], "cv.pdf"),
      preview: "blob:cv",
    },
  });
  const otherAccount = render(
    <StudentSignUp accountId="student-two" interests={[]} />
  );
  expect(screen.queryByText("Complete profile")).toBeNull();
  otherAccount.unmount();

  render(<StudentSignUp accountId="student-one" interests={[]} />);
  expect(readStudentDraft("student-one")?.answers).not.toHaveProperty("cv");
  expect(readStudentDraft("student-one")?.answers).not.toHaveProperty("avatar");
  expect(readStudentDraft("student-one")?.answers).not.toHaveProperty(
    "password"
  );
  fireEvent.click(screen.getByRole("button", { name: "Complete profile" }));
  expect(readStudentDraft("student-one")).toBeUndefined();
});
