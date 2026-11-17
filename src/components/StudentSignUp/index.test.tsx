import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import StudentSignUp from ".";

vi.mock("@/components/SignUp/AccountDetailsStep", () => ({
  default: ({ data }: { data: { email: string | null } }) => (
    <p>{data.email ?? "Email por indicar"}</p>
  ),
}));
vi.mock("@/components/SignUp/BioStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/InterestsStep", () => ({ default: () => null }));
vi.mock("@/components/SignUp/FinalStep", () => ({ default: () => null }));

test("starts with an explicit contact email independent from login", () => {
  render(<StudentSignUp interests={[]} />);

  expect(screen.getByText("Email por indicar")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
});
