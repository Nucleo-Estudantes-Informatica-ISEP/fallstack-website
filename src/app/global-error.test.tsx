import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GlobalError from "./global-error";

import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

describe("GlobalError", () => {
  const error = new Error("detalhe interno secreto");

  beforeEach(() => {
    // O componente tem <html>/<body> próprios; o React avisa por estar dentro de um <div> de teste.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports the error to Sentry", () => {
    render(<GlobalError error={error} reset={vi.fn()} />);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("does not render the error message", () => {
    render(<GlobalError error={error} reset={vi.fn()} />);
    expect(screen.queryByText(/detalhe interno secreto/)).toBeNull();
  });

  it("calls reset when 'Tentar novamente' is clicked", () => {
    const reset = vi.fn();
    render(<GlobalError error={error} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("links home with a plain anchor", () => {
    render(<GlobalError error={error} reset={vi.fn()} />);
    const link = screen.getByRole("link", { name: "Página inicial" });
    expect(link.getAttribute("href")).toBe("/");
  });
});
