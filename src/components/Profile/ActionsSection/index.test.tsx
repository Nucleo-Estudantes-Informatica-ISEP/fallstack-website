import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import type { StudentActionDto } from "@/application/dto/actionDto";

import ActionsSection from ".";

const action = (overrides: Partial<StudentActionDto>): StudentActionDto => ({
  id: "a1",
  name: "Visita o stand",
  description: "Conversa com um recrutador",
  points: 5,
  altText: null,
  isLive: false,
  isVisible: true,
  done: false,
  ...overrides,
});

const hidden = {
  id: "a2",
  name: "Desafio secreto",
  description: "Encontra o staff laranja",
  altText: "Desafio surpresa",
};

test("shows the empty text when there are no challenges", () => {
  render(<ActionsSection actions={[]} />);

  expect(
    screen.getByText("Não há desafios disponíveis...")
  ).toBeInTheDocument();
  expect(screen.queryByRole("listitem")).toBeNull();
});

test("shows each challenge's name, description and points", () => {
  render(<ActionsSection actions={[action({})]} />);

  const item = screen.getByRole("listitem");
  expect(within(item).getByText("Visita o stand")).toBeInTheDocument();
  expect(
    within(item).getByText("Conversa com um recrutador")
  ).toBeInTheDocument();
  expect(within(item).getByText("5 pontos")).toBeInTheDocument();
});

test("a hidden challenge shows its alternative text and a masked description until done", () => {
  render(<ActionsSection actions={[action(hidden)]} />);

  expect(screen.getByText("Desafio surpresa")).toBeInTheDocument();
  expect(screen.getByText("???????? ? ????? ???????")).toBeInTheDocument();
  expect(screen.queryByText("Desafio secreto")).toBeNull();
  expect(screen.queryByText("Encontra o staff laranja")).toBeNull();
});

test("a hidden challenge shows its real name and description once done", () => {
  render(<ActionsSection actions={[action({ ...hidden, done: true })]} />);

  expect(screen.getByText("Desafio secreto")).toBeInTheDocument();
  expect(screen.getByText("Encontra o staff laranja")).toBeInTheDocument();
  expect(screen.queryByText("Desafio surpresa")).toBeNull();
});

test("the done mark appears only on done challenges", () => {
  render(
    <ActionsSection
      actions={[
        action({ id: "done", name: "Feito", done: true }),
        action({ id: "todo", name: "Por fazer", done: false }),
      ]}
    />
  );

  const [done, todo] = screen.getAllByRole("listitem");
  expect(within(done).getByText("Feito")).toBeInTheDocument();
  expect(done.querySelector("svg")).not.toBeNull();
  expect(within(todo).getByText("Por fazer")).toBeInTheDocument();
  expect(todo.querySelector("svg")).toBeNull();
});

test("uses the singular for one point and the plural otherwise", () => {
  render(
    <ActionsSection
      actions={[
        action({ id: "one", name: "Um", points: 1 }),
        action({ id: "zero", name: "Zero", points: 0 }),
        action({ id: "many", name: "Muitos", points: 15 }),
      ]}
    />
  );

  const [one, zero, many] = screen.getAllByRole("listitem");
  expect(within(one).getByText("1 ponto")).toBeInTheDocument();
  expect(within(zero).getByText("0 pontos")).toBeInTheDocument();
  expect(within(many).getByText("15 pontos")).toBeInTheDocument();
  expect(screen.queryByText("1 pontos")).toBeNull();
});

test("says in words whether each challenge is done", () => {
  render(
    <ActionsSection
      actions={[
        action({ id: "done", name: "Feito", done: true }),
        action({ id: "todo", name: "Por fazer", done: false }),
      ]}
    />
  );

  const [done, todo] = screen.getAllByRole("listitem");
  expect(within(done).getByText("Concluído")).toHaveClass("sr-only");
  expect(within(todo).getByText("Por concluir")).toHaveClass("sr-only");
  expect(within(done).queryByText("Por concluir")).toBeNull();
});

test("a hidden description is masked for sight and explained to screen readers", () => {
  render(<ActionsSection actions={[action(hidden)]} />);

  expect(screen.getByText("???????? ? ????? ???????")).toHaveAttribute(
    "aria-hidden",
    "true"
  );
  expect(
    screen.getByText("Descrição revelada quando concluíres o desafio.")
  ).toHaveClass("sr-only");
});

test("a done hidden challenge has no masking label", () => {
  render(<ActionsSection actions={[action({ ...hidden, done: true })]} />);

  expect(
    screen.queryByText("Descrição revelada quando concluíres o desafio.")
  ).toBeNull();
});

test("rows are rounded token surfaces with no orange border, inline style or hover", () => {
  render(<ActionsSection actions={[action({})]} />);

  const row = screen.getByRole("listitem");
  expect(row).not.toHaveAttribute("style");
  expect(row).toHaveClass("bg-ui-surface-raised", "rounded-[1.875rem]");
  expect(row.className).not.toMatch(/border-ui-highlight|hover:/);
  expect(row.querySelector("[style]")).toBeNull();
});

test("long text wraps beside the points instead of pushing them below", () => {
  const long = "palavra".repeat(40);
  render(
    <ActionsSection
      actions={[action({ name: long, description: `${long} ${long}` })]}
    />
  );

  const row = screen.getByRole("listitem");
  expect(row).not.toHaveClass("flex-wrap");
  expect(screen.getByText(long).parentElement).toHaveClass(
    "min-w-0",
    "flex-1",
    "wrap-break-word"
  );
  expect(screen.getByText("5 pontos").parentElement).toHaveClass("shrink-0");
});
