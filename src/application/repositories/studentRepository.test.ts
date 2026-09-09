import { beforeEach, expect, test, vi } from "vitest";

import {
  connectStudentInterests,
  setStudentInterests,
} from "./studentRepository";

const { update } = vi.hoisted(() => ({
  update: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({
  default: { student: { update } },
}));

const AI_ID = "00000000-0000-4000-8000-000000000001";
const WEB_ID = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({ id: "user-id" });
});

test("sets interest relations directly by stable id", async () => {
  await setStudentInterests("user-id", [AI_ID, WEB_ID]);

  expect(update).toHaveBeenCalledWith({
    where: { id: "user-id" },
    data: { interests: { set: [{ id: AI_ID }, { id: WEB_ID }] } },
  });
});

test("connects interest relations directly by stable id", async () => {
  await connectStudentInterests("user-id", [AI_ID]);

  expect(update).toHaveBeenCalledWith({
    where: { id: "user-id" },
    data: { interests: { connect: [{ id: AI_ID }] } },
  });
});
