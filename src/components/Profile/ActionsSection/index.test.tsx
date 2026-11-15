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
