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

test("renders an accessible tab list", () => {
  render(<TestTabs />);

  expect(
    screen.getByRole("tablist", { name: "Secções do perfil" })
  ).toBeInTheDocument();

  expect(screen.getAllByRole("tab")).toHaveLength(3);

  expect(screen.getByRole("tab", { name: "Detalhes" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("changes the selected tab when clicked", () => {
  render(<TestTabs />);

  fireEvent.click(screen.getByRole("tab", { name: "Links" }));

  expect(screen.getByTestId("active-index")).toHaveTextContent("1");
  expect(screen.getByRole("tab", { name: "Links" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("supports keyboard navigation with arrow keys", () => {
  render(<TestTabs />);

  const details = screen.getByRole("tab", { name: "Detalhes" });
  details.focus();

  fireEvent.keyDown(details, { key: "ArrowRight" });

  const links = screen.getByRole("tab", { name: "Links" });

  expect(links).toHaveFocus();
  expect(links).toHaveAttribute("aria-selected", "true");

  fireEvent.keyDown(links, { key: "ArrowLeft" });

  expect(details).toHaveFocus();
  expect(details).toHaveAttribute("aria-selected", "true");
});

test("supports Home and End keys", () => {
  render(<TestTabs />);

  const details = screen.getByRole("tab", { name: "Detalhes" });
  details.focus();

  fireEvent.keyDown(details, { key: "End" });

  const video = screen.getByRole("tab", { name: "Vídeo" });

  expect(video).toHaveFocus();
  expect(screen.getByTestId("active-index")).toHaveTextContent("2");

  fireEvent.keyDown(video, { key: "Home" });

  expect(details).toHaveFocus();
  expect(screen.getByTestId("active-index")).toHaveTextContent("0");
});

test("skips hidden sections while preserving original indices", () => {
  render(<TestTabs hasLinksSection={false} />);

  expect(screen.queryByRole("tab", { name: "Links" })).not.toBeInTheDocument();

  const details = screen.getByRole("tab", { name: "Detalhes" });
  details.focus();

  fireEvent.keyDown(details, { key: "ArrowRight" });

  const video = screen.getByRole("tab", { name: "Vídeo" });

  expect(video).toHaveFocus();
  expect(video).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("active-index")).toHaveTextContent("2");
});

test("wraps keyboard navigation between visible tabs", () => {
  render(<TestTabs hasLinksSection={false} />);

  const details = screen.getByRole("tab", { name: "Detalhes" });
  details.focus();

  fireEvent.keyDown(details, { key: "ArrowLeft" });

  expect(screen.getByRole("tab", { name: "Vídeo" })).toHaveFocus();
});

test("keeps only the selected tab in the normal tab order", () => {
  render(<TestTabs />);

  expect(screen.getByRole("tab", { name: "Detalhes" })).toHaveAttribute(
    "tabindex",
    "0"
  );

  expect(screen.getByRole("tab", { name: "Links" })).toHaveAttribute(
    "tabindex",
    "-1"
  );

  fireEvent.click(screen.getByRole("tab", { name: "Links" }));

  expect(screen.getByRole("tab", { name: "Links" })).toHaveAttribute(
    "tabindex",
    "0"
  );
});
