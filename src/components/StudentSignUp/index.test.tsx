import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import StudentSignUp from ".";

vi.mock("@/components/SignUp/AccountDetailsStep", () => ({
  default: ({ institutionalEmail }: { institutionalEmail: string }) => (
    <p>{institutionalEmail}</p>
  ),
}));
vi.mock("@/components/SignUp/BioStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/InterestsStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/FinalStep", () => ({ default: () => null }));

test("starts with the account details using the server-provided email", () => {
  render(
    <StudentSignUp interests={[]} institutionalEmail="student@example.test" />
  );

  expect(screen.getByText("student@example.test")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
});
