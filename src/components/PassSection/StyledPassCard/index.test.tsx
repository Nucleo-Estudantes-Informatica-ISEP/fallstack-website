import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import StyledPassCard from ".";

test("QR dialog supports Escape and restores focus to trigger", () => {
  render(
    <StyledPassCard
      name="Long student name"
      code="12345"
      qrValue="signed-token"
    />
  );
  const trigger = screen.getByRole("button", {
    name: "Ver QR code em tamanho grande",
  });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog")).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(trigger).toHaveFocus();
});
test.each([
  { loading: true, qrValue: null },
  { loading: false, qrValue: null },
])("does not open an unavailable QR", (props) => {
  render(<StyledPassCard name="Student" {...props} />);
  expect(screen.getByRole("button")).toBeDisabled();
});
