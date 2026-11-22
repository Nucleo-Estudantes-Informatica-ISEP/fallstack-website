import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { useLogout } from "./useLogout";

const { post, clear } = vi.hoisted(() => ({
  post: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@/lib/http/client", () => ({ httpClient: { post } }));
vi.mock("./useSession", () => ({ default: () => ({ clear }) }));
vi.mock("@/components/ConfirmDialog", () => ({
  default: ({ onConfirm }: { onConfirm: () => void }) => (
    <button onClick={onConfirm}>Confirm logout</button>
  ),
}));

test("preserves account-scoped drafts on successful logout", async () => {
  const key = "fallstack:student-signup:v1:student-one";
  const otherAccount = "fallstack:student-signup:v1:student-two";
  window.localStorage.setItem(key, "draft contents");
  window.localStorage.setItem(otherAccount, "other draft");
  window.localStorage.setItem("theme", "dark");
  post.mockResolvedValue({ logoutUrl: "#logged-out" });

  function Logout() {
    return useLogout().ConfirmDialog;
  }
  render(<Logout />);
  fireEvent.click(screen.getByRole("button", { name: "Confirm logout" }));

  await waitFor(() => expect(clear).toHaveBeenCalledOnce());
  expect(window.localStorage.getItem(key)).toBe("draft contents");
  expect(window.localStorage.getItem(otherAccount)).toBe("other draft");
  expect(window.localStorage.getItem("theme")).toBe("dark");
});
