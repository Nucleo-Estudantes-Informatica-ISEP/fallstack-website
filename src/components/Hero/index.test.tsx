import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import Hero from ".";

vi.mock("@/hooks/useSession", () => ({ default: () => ({ user: null }) }));

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

afterEach(() => vi.unstubAllGlobals());

test("the hero logo has a reduced maximum width", () => {
  render(<Hero contentRef={createRef<HTMLDivElement>()} />);
  expect(screen.getByAltText(/fallstack/i)).toHaveClass(
    "max-w-56",
    "object-contain"
  );
});
