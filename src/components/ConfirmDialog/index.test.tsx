import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import ConfirmDialog from "@/components/ConfirmDialog";

interface TestDialogProps {
  isConfirming?: boolean;
  onConfirm?: () => void;
}

const TestDialog = ({
  isConfirming = false,
  onConfirm = vi.fn(),
}: TestDialogProps) => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <ConfirmDialog
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      title="Eliminar registo"
      message="Tens a certeza?"
      confirmLabel="Eliminar"
      cancelLabel="Cancelar"
      onConfirm={onConfirm}
      isConfirming={isConfirming}
    />
  );
};

test("renders an accessible confirmation dialog", () => {
  render(<TestDialog />);

  expect(
    screen.getByRole("dialog", { name: "Eliminar registo" })
  ).toBeInTheDocument();

  expect(screen.getByText("Tens a certeza?")).toBeInTheDocument();
});

test("closes when Cancelar is clicked", () => {
  render(<TestDialog />);

  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("calls onConfirm when Eliminar is clicked", () => {
  const onConfirm = vi.fn();

  render(<TestDialog onConfirm={onConfirm} />);

  fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

  expect(onConfirm).toHaveBeenCalledOnce();
});

test("disables Cancelar while confirming", () => {
  render(<TestDialog isConfirming />);

  expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
});

test("prevents closing with Escape while confirming", () => {
  render(<TestDialog isConfirming />);

  fireEvent.keyDown(document, { key: "Escape" });

  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("prevents closing through the backdrop while confirming", () => {
  render(<TestDialog isConfirming />);

  const dialog = screen.getByRole("dialog");
  const backdrop = dialog.previousElementSibling;

  expect(backdrop).not.toBeNull();

  fireEvent.click(backdrop!);

  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
