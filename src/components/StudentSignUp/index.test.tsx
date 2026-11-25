import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import StudentSignUp from ".";
import { readStudentDraft } from "./draft";

vi.mock("@/components/SignUp/BioStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/InterestsStep", () => ({ default: () => null }));
const { createProfile, push } = vi.hoisted(() => ({
  createProfile: vi.fn(async () => true),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
vi.mock("@/hooks/useSession", () => ({
  default: () => ({ fetchSession: vi.fn() }),
}));
vi.mock("@/client/api/session", () => ({
  default: async () => ({ role: "STUDENT", student: null }),
}));
vi.mock("@/client/api/auth", () => ({
  createStudentProfile: createProfile,
}));
vi.mock("@/client/api/upload", () => ({
  uploadAvatar: vi.fn(),
  uploadCv: vi.fn(),
}));

const key = "fallstack:student-signup:v1:student-one";
const interests = [{ id: "current-interest", name: "Computing" }];

beforeEach(() => window.localStorage.clear());

test("saves an explicit contact email edited in the form", () => {
  render(<StudentSignUp accountId="student-one" interests={interests} />);
  const email = screen.getByRole("textbox", { name: "Email institucional" });
  expect(email).toHaveValue("");
  fireEvent.change(email, { target: { value: "1234567@isep.ipp.pt" } });
  expect(readStudentDraft("student-one")?.answers.email).toBe(
    "1234567@isep.ipp.pt"
  );
});

test("restores the owner's step and valid answers, then clears the draft on completion", async () => {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      step: 3,
      answers: {
        name: "Student",
        email: "1234567@isep.ipp.pt",
        bio: "Saved introduction",
        interests: ["current-interest", "removed-interest"],
        year: "1º Ano Licenciatura",
        course: "Engenharia Informática",
        linkedin: "https://www.linkedin.com/in/student",
      },
    })
  );
  const other = render(
    <StudentSignUp accountId="student-two" interests={interests} />
  );
  expect(
    screen.getByRole("textbox", { name: "Email institucional" })
  ).toHaveValue("");
  expect(screen.queryByPlaceholderText("Insere um link")).toBeNull();
  other.unmount();

  render(<StudentSignUp accountId="student-one" interests={interests} />);
  const linkedin = screen.getByPlaceholderText("Insere um link");
  expect(linkedin).toHaveValue("https://www.linkedin.com/in/student");
  expect(readStudentDraft("student-one")?.answers.interests).toEqual([
    "current-interest",
  ]);
  for (const checkbox of screen.getAllByRole("checkbox"))
    fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: /concluir/i }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  expect(createProfile).toHaveBeenCalledOnce();
  expect(readStudentDraft("student-one")).toBeUndefined();

  fireEvent.change(linkedin, { target: { value: "" } });
  expect(readStudentDraft("student-one")).toBeUndefined();
});

test.each(["{", JSON.stringify({ step: 99, answers: {} })])(
  "ignores invalid stored drafts",
  (value) => {
    window.localStorage.setItem(key, value);
    render(<StudentSignUp accountId="student-one" interests={interests} />);
    expect(
      screen.getByRole("textbox", { name: "Email institucional" })
    ).toHaveValue("");
  }
);

test("preserves answers but returns to account details when the stored year is unknown", () => {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      step: 3,
      answers: {
        name: "Student",
        email: "1234567@isep.ipp.pt",
        bio: "",
        interests: [],
        year: "unknown",
        course: "Engenharia Informática",
        linkedin: null,
      },
    })
  );
  render(<StudentSignUp accountId="student-one" interests={interests} />);
  expect(screen.getByRole("textbox", { name: "Curso" })).toHaveValue(
    "Engenharia Informática"
  );
  expect(screen.getByRole("combobox")).toHaveValue("");
  expect(screen.queryByRole("button", { name: /concluir/i })).toBeNull();
});

test("does not restore again when the parent supplies a new interests array", () => {
  const { rerender } = render(
    <StudentSignUp accountId="student-one" interests={interests} />
  );
  const course = screen.getByRole("textbox", { name: "Curso" });
  fireEvent.change(course, { target: { value: "Current course" } });
  const draft = readStudentDraft("student-one")!;
  window.localStorage.setItem(
    key,
    JSON.stringify({
      ...draft,
      answers: { ...draft.answers, course: "Stale course" },
    })
  );
  rerender(
    <StudentSignUp accountId="student-one" interests={[...interests]} />
  );
  expect(course).toHaveValue("Current course");
});
