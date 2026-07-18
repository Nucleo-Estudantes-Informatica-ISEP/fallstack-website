import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import InterestSelector from ".";

test("renders server-provided interests and updates selection", () => {
  const setUserInterests = vi.fn();

  render(
    <InterestSelector
      availableInterests={[
        { id: "typescript", name: "TypeScript" },
        { id: "react", name: "React" },
      ]}
      userInterests={["TypeScript"]}
      setUserInterests={setUserInterests}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "React" }));

  expect(setUserInterests).toHaveBeenCalledWith(["TypeScript", "React"]);
});
