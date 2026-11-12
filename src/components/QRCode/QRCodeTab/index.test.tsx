import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import QRCodeTab from "@/components/QRCode/QRCodeTab";

const tabTitles = ["Perfil", "Empresa", "Scan"];

function renderTabs() {
  const setTitleIndex = vi.fn();

  render(
    <QRCodeTab
      tabTitles={tabTitles}
      tabs={[
        <p key="profile">Conteúdo do perfil</p>,
        <p key="company">Conteúdo da empresa</p>,
        <p key="scan">Conteúdo do scan</p>,
      ]}
      setTitleIndex={setTitleIndex}
    />
  );

  return { setTitleIndex };
}

test("renders an accessible tab list", () => {
  renderTabs();

  expect(
    screen.getByRole("tablist", { name: "Navegação do QR Code" })
  ).toBeInTheDocument();

  expect(screen.getAllByRole("tab")).toHaveLength(3);

  expect(screen.getByRole("tab", { name: "Perfil" })).toHaveAttribute(
    "aria-selected",
    "true"
  );

  expect(screen.getByRole("tab", { name: "Empresa" })).toHaveAttribute(
    "aria-selected",
    "false"
  );
});

test("associates the selected tab with its panel", () => {
  renderTabs();

  const tab = screen.getByRole("tab", { name: "Perfil" });
  const panel = screen.getByRole("tabpanel");

  expect(tab).toHaveAttribute("aria-controls", panel.id);
  expect(panel).toHaveAttribute("aria-labelledby", tab.id);
  expect(panel).toHaveTextContent("Conteúdo do perfil");
});

test("changes tabs when clicked and updates the parent title", () => {
  const { setTitleIndex } = renderTabs();

  fireEvent.click(screen.getByRole("tab", { name: "Empresa" }));

  expect(setTitleIndex).toHaveBeenCalledWith(1);
  expect(screen.getByRole("tab", { name: "Empresa" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
});

test("supports keyboard navigation with arrow keys", () => {
  const { setTitleIndex } = renderTabs();

  const firstTab = screen.getByRole("tab", { name: "Perfil" });
  firstTab.focus();

  fireEvent.keyDown(firstTab, { key: "ArrowRight" });

  const secondTab = screen.getByRole("tab", { name: "Empresa" });

  expect(secondTab).toHaveFocus();
  expect(secondTab).toHaveAttribute("aria-selected", "true");
  expect(setTitleIndex).toHaveBeenCalledWith(1);

  fireEvent.keyDown(secondTab, { key: "ArrowLeft" });

  expect(firstTab).toHaveFocus();
  expect(firstTab).toHaveAttribute("aria-selected", "true");
});

test("wraps keyboard navigation from the first to the last tab", () => {
  renderTabs();

  const firstTab = screen.getByRole("tab", { name: "Perfil" });
  firstTab.focus();

  fireEvent.keyDown(firstTab, { key: "ArrowLeft" });

  expect(screen.getByRole("tab", { name: "Scan" })).toHaveFocus();
});

test("supports Home and End keys", () => {
  renderTabs();

  const firstTab = screen.getByRole("tab", { name: "Perfil" });
  firstTab.focus();

  fireEvent.keyDown(firstTab, { key: "End" });

  const lastTab = screen.getByRole("tab", { name: "Scan" });
  expect(lastTab).toHaveFocus();

  fireEvent.keyDown(lastTab, { key: "Home" });

  expect(firstTab).toHaveFocus();
});

test("keeps only the selected tab in the normal tab order", () => {
  renderTabs();

  expect(screen.getByRole("tab", { name: "Perfil" })).toHaveAttribute(
    "tabindex",
    "0"
  );

  expect(screen.getByRole("tab", { name: "Empresa" })).toHaveAttribute(
    "tabindex",
    "-1"
  );
});
