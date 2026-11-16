import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Modal from "@/components/ui/Modal";

const TestModal = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <button onClick={() => setIsVisible(true)}>Abrir modal</button>

      <Modal
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        aria-labelledby="test-modal-title"
      >
        <h2 id="test-modal-title">Modal de teste</h2>

        <button>Primeiro botão</button>
        <button>Último botão</button>
      </Modal>
    </>
  );
};

test("does not render when closed", () => {
  render(<TestModal />);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("opens with an accessible title", () => {
  render(<TestModal />);

  fireEvent.click(screen.getByRole("button", { name: "Abrir modal" }));

  expect(
    screen.getByRole("dialog", { name: "Modal de teste" })
  ).toBeInTheDocument();
});

test("focuses the dialog when opened", () => {
  render(<TestModal />);

  fireEvent.click(screen.getByRole("button", { name: "Abrir modal" }));

  expect(screen.getByRole("dialog")).toHaveFocus();
});

test("closes when Escape is pressed", () => {
  render(<TestModal />);

  fireEvent.click(screen.getByRole("button", { name: "Abrir modal" }));

  fireEvent.keyDown(document, { key: "Escape" });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("returns focus to the previous element", () => {
  render(<TestModal />);

  const trigger = screen.getByRole("button", { name: "Abrir modal" });

  trigger.focus();
  fireEvent.click(trigger);

  expect(screen.getByRole("dialog")).toHaveFocus();

  fireEvent.keyDown(document, { key: "Escape" });

  expect(trigger).toHaveFocus();
});

test("wraps focus from the last button to the first", () => {
  render(<TestModal />);

  fireEvent.click(screen.getByRole("button", { name: "Abrir modal" }));

  const first = screen.getByRole("button", { name: "Primeiro botão" });
  const last = screen.getByRole("button", { name: "Último botão" });

  last.focus();
  fireEvent.keyDown(document, { key: "Tab" });

  expect(first).toHaveFocus();
});

test("wraps focus backwards with Shift+Tab", () => {
  render(<TestModal />);

  fireEvent.click(screen.getByRole("button", { name: "Abrir modal" }));

  const first = screen.getByRole("button", { name: "Primeiro botão" });
  const last = screen.getByRole("button", { name: "Último botão" });

  first.focus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

  expect(last).toHaveFocus();
});

test("recovers focus when it moves outside the dialog", () => {
  render(<TestModal />);

  fireEvent.click(screen.getByRole("button", { name: "Abrir modal" }));

  screen.getByRole("button", { name: "Abrir modal" }).focus();

  fireEvent.keyDown(document, { key: "Tab" });

  expect(screen.getByRole("button", { name: "Primeiro botão" })).toHaveFocus();
});
