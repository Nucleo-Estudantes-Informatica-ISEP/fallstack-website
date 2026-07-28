import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import StudentSignUp from ".";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/hooks/useSession", () => ({ default: () => ({ user: null }) }));
vi.mock("@/components/SignUp/NameStep", () => ({
  default: () => <p>Name step</p>,
}));
vi.mock("@/components/SignUp/AccountDetailsStep", () => ({
  default: () => <p>Account step</p>,
}));
vi.mock("@/components/SignUp/BioStep", () => ({
  default: () => <p>Bio step</p>,
}));
vi.mock("@/components/SignUp/InterestsStep", () => ({
  default: () => <p>Interests step</p>,
}));
vi.mock("@/components/SignUp/FinalStep", () => ({
  default: () => <p>Final step</p>,
}));

beforeEach(() => {
  window.history.replaceState({}, "", "/signup?authnei=1");
  window.sessionStorage.clear();
});

test("collects a name after an AuthNEI login without a saved signup draft", async () => {
  render(<StudentSignUp interests={[]} />);

  await screen.findByText("Name step");
  expect(screen.queryByText("Account step")).toBeNull();
});
