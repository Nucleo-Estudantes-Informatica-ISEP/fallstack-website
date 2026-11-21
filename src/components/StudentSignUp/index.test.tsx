import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { StudentSignUpData } from "@/types/StudentSignUpData";

import StudentSignUp from ".";
import { readStudentDraft } from "./draft";

vi.mock("@/components/SignUp/AccountDetailsStep", () => ({
  default: ({
    data,
    setData,
  }: {
    data: StudentSignUpData;
    setData: React.Dispatch<React.SetStateAction<StudentSignUpData>>;
  }) => (
    <input
      aria-label="Contact email"
      value={data.email ?? ""}
      onChange={(event) => {
        const email = event.target.value;
        setData((previous) => ({ ...previous, email }));
      }}
    />
  ),
}));
vi.mock("@/components/SignUp/BioStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/InterestsStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/FinalStep", () => ({
  default: ({
    data,
    onProfileCreated,
  }: {
    data: StudentSignUpData;
    onProfileCreated: () => void;
  }) => (
    <>
      <p>{data.bio}</p>
      <p>{data.interests.join(",")}</p>
      <button onClick={onProfileCreated}>Complete profile</button>
    </>
  ),
}));

const key = "fallstack:student-signup:v1:student-one";
const interests = [{ id: "current-interest", name: "Computing" }];

beforeEach(() => window.localStorage.clear());

test("saves an explicit contact email edited in the form", () => {
  render(<StudentSignUp accountId="student-one" interests={interests} />);
  const email = screen.getByRole("textbox", { name: "Contact email" });
  expect(email).toHaveValue("");
  fireEvent.change(email, { target: { value: "student@example.test" } });
  expect(readStudentDraft("student-one")?.answers.email).toBe(
    "student@example.test"
  );
});

test("restores the owner's step and valid answers, then clears the draft on completion", () => {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      step: 3,
      answers: {
        name: "Student",
        email: "student@example.test",
        bio: "Saved introduction",
        interests: ["current-interest", "removed-interest"],
        year: null,
        linkedin: null,
      },
    })
  );
  const other = render(
    <StudentSignUp accountId="student-two" interests={interests} />
  );
  expect(screen.getByRole("textbox", { name: "Contact email" })).toHaveValue(
    ""
  );
  expect(screen.queryByText("Saved introduction")).toBeNull();
  other.unmount();

  render(<StudentSignUp accountId="student-one" interests={interests} />);
  expect(screen.getByText("Saved introduction")).toBeInTheDocument();
  expect(screen.getByText("current-interest")).toBeInTheDocument();
  expect(readStudentDraft("student-one")?.answers.interests).toEqual([
    "current-interest",
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Complete profile" }));
  expect(readStudentDraft("student-one")).toBeUndefined();
});

test.each(["{", JSON.stringify({ step: 99, answers: {} })])(
  "ignores invalid stored drafts",
  (value) => {
    window.localStorage.setItem(key, value);
    expect(readStudentDraft("student-one")).toBeUndefined();
  }
);
