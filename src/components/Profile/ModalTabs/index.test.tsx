import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import ModalTabs from "@/components/Profile/ModalTabs";

vi.mock("@/hooks/useTabWidth", () => ({
  default: () => ["w-1/3"],
}));

interface TestTabsProps {
  hasDetailsSection?: boolean;
  hasLinksSection?: boolean;
  hasVideoSection?: boolean;
}

function TestTabs({
  hasDetailsSection = true,
  hasLinksSection = true,
  hasVideoSection = true,
}: TestTabsProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  return (
    <>
      <output data-testid="active-index">{activeTabIndex}</output>
      <ModalTabs
        activeTabIndex={activeTabIndex}
        setActiveTabIndex={setActiveTabIndex}
        hasDetailsSection={hasDetailsSection}
        hasLinksSection={hasLinksSection}
        hasVideoSection={hasVideoSection}
      />
    </>
  );
}

test("renders accessible section buttons", () => {
  render(<TestTabs />);

  expect(screen.getByTestId("active-index")).toBeInTheDocument();

  expect(screen.getAllByRole("button")).toHaveLength(3);

  expect(screen.getByRole("button", { name: "Detalhes" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("changes the selected tab when clicked", () => {
  render(<TestTabs />);

  fireEvent.click(screen.getByRole("button", { name: "Links" }));

  expect(screen.getByTestId("active-index")).toHaveTextContent("1");
  expect(screen.getByRole("button", { name: "Links" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("supports keyboard navigation with arrow keys", () => {
  render(<TestTabs />);

  const details = screen.getByRole("button", { name: "Detalhes" });
  details.focus();

  fireEvent.keyDown(details, { key: "ArrowRight" });

  const links = screen.getByRole("button", { name: "Links" });

  expect(links).toHaveFocus();
  expect(links).toHaveAttribute("aria-pressed", "true");

  fireEvent.keyDown(links, { key: "ArrowLeft" });

  expect(details).toHaveFocus();
  expect(details).toHaveAttribute("aria-pressed", "true");
});

test("supports Home and End keys", () => {
  render(<TestTabs />);

  const details = screen.getByRole("button", { name: "Detalhes" });
  details.focus();

  fireEvent.keyDown(details, { key: "End" });

  const video = screen.getByRole("button", { name: "Vídeo" });

  expect(video).toHaveFocus();
  expect(screen.getByTestId("active-index")).toHaveTextContent("2");

  fireEvent.keyDown(video, { key: "Home" });

  expect(details).toHaveFocus();
  expect(screen.getByTestId("active-index")).toHaveTextContent("0");
});

test("skips hidden sections while preserving original indices", () => {
  render(<TestTabs hasLinksSection={false} />);

  expect(screen.queryByRole("tab", { name: "Links" })).not.toBeInTheDocument();

  const details = screen.getByRole("button", { name: "Detalhes" });
  details.focus();

  fireEvent.keyDown(details, { key: "ArrowRight" });

  const video = screen.getByRole("button", { name: "Vídeo" });

  expect(video).toHaveFocus();
  expect(video).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("active-index")).toHaveTextContent("2");
});

test("wraps keyboard navigation between visible tabs", () => {
  render(<TestTabs hasLinksSection={false} />);

  const details = screen.getByRole("button", { name: "Detalhes" });
  details.focus();

  fireEvent.keyDown(details, { key: "ArrowLeft" });

  expect(screen.getByRole("button", { name: "Vídeo" })).toHaveFocus();
});

test("keeps only the active section button in the normal tab order", () => {
  render(<TestTabs />);

  expect(screen.getByRole("button", { name: "Detalhes" })).toHaveAttribute(
    "tabindex",
    "0"
  );

  expect(screen.getByRole("button", { name: "Links" })).toHaveAttribute(
    "tabindex",
    "-1"
  );

  fireEvent.click(screen.getByRole("button", { name: "Links" }));

  expect(screen.getByRole("button", { name: "Links" })).toHaveAttribute(
    "tabindex",
    "0"
  );
});
