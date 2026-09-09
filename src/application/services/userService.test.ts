import { beforeEach, expect, test, vi } from "vitest";

import { setCompanyInterests } from "../repositories/companyRepository";
import { setStudentInterests } from "../repositories/studentRepository";
import { updateUserInterests } from "./userService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/companyRepository", () => ({
  setCompanyInterests: vi.fn(),
}));

vi.mock("../repositories/studentRepository", () => ({
  setStudentInterests: vi.fn(),
}));
const AI_ID = "00000000-0000-4000-8000-000000000001";
const WEB_ID = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
});

test("updates only the current student when no company is provided", async () => {
  await updateUserInterests({ userId: "user-1", interests: [AI_ID] });

  expect(setStudentInterests).toHaveBeenCalledWith("user-1", [AI_ID]);
  expect(setCompanyInterests).not.toHaveBeenCalled();
});

test("updates company interests once without per-employee fan-out", async () => {
  const result = await updateUserInterests({
    userId: "employee-1",
    companyId: "company-1",
    interests: [WEB_ID],
  });

  expect(setCompanyInterests).toHaveBeenCalledOnce();
  expect(setCompanyInterests).toHaveBeenCalledWith("company-1", [WEB_ID]);
  expect(setStudentInterests).not.toHaveBeenCalled();
  expect(result).toEqual({ success: true });
});
