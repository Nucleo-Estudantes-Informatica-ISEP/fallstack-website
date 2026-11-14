import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import AuthNeiButton from ".";

const assign = vi.fn();

beforeEach(() => {
  vi.stubGlobal("location", { origin: "http://localhost:3000", assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("continues through the AuthNEI login route and keeps the destination", () => {
  render(<AuthNeiButton next="/signup" />);

  fireEvent.click(
    screen.getByRole("button", { name: "Continuar com AuthNEI" })
  );

  expect(assign).toHaveBeenCalledWith(
    "http://localhost:3000/api/auth/login?next=%2Fsignup"
  );
});

test("defaults the destination to the home page", () => {
  render(<AuthNeiButton />);

  fireEvent.click(
    screen.getByRole("button", { name: "Continuar com AuthNEI" })
  );

  expect(assign).toHaveBeenCalledWith(
    "http://localhost:3000/api/auth/login?next=%2F"
  );
});
