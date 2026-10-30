import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { httpClient } from "@/lib/http/client";
import type { AdminCompanyRankDto } from "@/application/dto/companyRankDto";

import CompanyRankForm from ".";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { patch: vi.fn().mockResolvedValue({}) },
}));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

test("loads rank Destaque setting and persists unchecking without losing entitlements", async () => {
  const rank: AdminCompanyRankDto = {
    id: "main-rank",
    name: "Main",
    order: 0,
    style: {
      gradientFromColor: "#fff",
      gradientFromStop: "0%",
      gradientToColor: "#fff",
      gradientToStop: "100%",
      hasInternalPage: true,
      showsPromoVideo: false,
      isFeatured: true,
    },
  };
  render(<CompanyRankForm rank={rank} />);
  const checkbox = screen.getByRole("checkbox", { name: /Destaque/ });
  expect(checkbox).toBeChecked();
  fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(httpClient.patch).toHaveBeenCalledWith(
      "/admin/company-ranks/main-rank",
      expect.objectContaining({
        style: expect.objectContaining({
          isFeatured: false,
          hasInternalPage: true,
          showsPromoVideo: false,
        }),
      })
    )
  );
});
