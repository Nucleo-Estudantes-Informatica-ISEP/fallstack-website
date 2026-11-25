import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { HttpClientError } from "@/lib/http/client";

import { useLogout } from "./useLogout";

const { post, clear, toastError } = vi.hoisted(() => ({
  post: vi.fn(),
  clear: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http/client")>()),
  httpClient: { post },
}));
vi.mock("./useSession", () => ({ default: () => ({ clear }) }));
vi.mock("react-toastify", () => ({ toast: { error: toastError } }));

beforeEach(() => vi.resetAllMocks());

function Logout() {
  const { handleLogout, ConfirmDialog } = useLogout();
  return (
    <>
      <button onClick={handleLogout}>Open dialog</button>
      {ConfirmDialog}
    </>
  );
}

test.each([
  ["app", "Terminar sessão só nesta aplicação"],
  ["shared", "Terminar sessão nesta aplicação e no AuthNEI"],
])("posts the %s sign-out scope", async (scope, label) => {
  post.mockResolvedValue({ logoutUrl: "#signed-out" });
  render(<Logout />);
  fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
  fireEvent.click(screen.getByRole("button", { name: label }));

  await waitFor(() => expect(clear).toHaveBeenCalledOnce());
  expect(post).toHaveBeenCalledWith(`/auth/logout?scope=${scope}`);
});

test.each([
  [
    new HttpClientError("Refresh required", 409, {
      code: "SHARED_SIGN_OUT_REAUTH_REQUIRED",
    }),
    "Termina sessão só nesta aplicação e volta a iniciar sessão para poderes terminar as duas sessões.",
  ],
  [
    new HttpClientError("Unavailable", 503),
    "Não foi possível terminar a sessão.",
  ],
])(
  "keeps the app session after a shared sign-out failure",
  async (error, message) => {
    post.mockRejectedValue(error);
    render(<Logout />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Terminar sessão nesta aplicação e no AuthNEI",
      })
    );

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(message));
    expect(clear).not.toHaveBeenCalled();
  }
);
