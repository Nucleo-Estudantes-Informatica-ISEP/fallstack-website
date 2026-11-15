import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { SessionDto } from "@/application/dto/sessionDto";

import QRCodeModal from ".";

vi.mock("@/hooks/useIsMobile", () => ({ default: () => true }));
vi.mock("@/components/QRCode/QRCodeTab/CompanyTab", () => ({
  default: () => <input aria-label="Código do estudante" />,
}));
vi.mock("@/components/QRCode/QRCodeTab/ScanTab", () => ({
  default: () => null,
}));
vi.mock("@/components/QRCode/QRCodeTab/ProfileTab", () => ({
  default: () => null,
}));

const employee: SessionDto = {
  role: "EMPLOYEE",
  adminRole: null,
  student: null,
};

test("the dialog scrolls so the typed-code fallback stays reachable on short phones", () => {
  // The body is locked while the modal is open, so the dialog itself must
  // scroll: the scanner plus the typed-code entry are taller than a short
  // phone screen.
  render(<QRCodeModal hidden={false} setHidden={vi.fn()} user={employee} />);

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveClass("overflow-y-auto");
  expect(dialog).not.toHaveClass("overflow-y-hidden");
  expect(dialog).toContainElement(screen.getByLabelText("Código do estudante"));
});

test("the content grows with what it holds instead of a fixed screen height", () => {
  render(<QRCodeModal hidden={false} setHidden={vi.fn()} user={employee} />);

  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading.parentElement).not.toHaveClass("h-screen");
  expect(heading.parentElement).toHaveClass("min-h-screen");
});
