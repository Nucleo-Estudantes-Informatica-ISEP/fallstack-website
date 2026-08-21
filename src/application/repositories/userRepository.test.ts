import { beforeEach, expect, test, vi } from "vitest";

import { setUserInterests } from "./userRepository";

const { findMany, update } = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({
  default: { interest: { findMany }, user: { update } },
}));

beforeEach(() => {
  vi.clearAllMocks();
  findMany.mockResolvedValue([
    { id: "ai-id", name: { PT: "Inteligência Artificial", EN: "AI" } },
    { id: "web-id", name: { PT: "Web", EN: "Web" } },
  ]);
  update.mockResolvedValue({ id: "user-id" });
});

test("interest relations use stable ids after names become JSON", async () => {
  await setUserInterests("user-id", ["AI", "Web"]);

  expect(update).toHaveBeenCalledWith({
    where: { id: "user-id" },
    data: { interests: { set: [{ id: "ai-id" }, { id: "web-id" }] } },
  });
});
