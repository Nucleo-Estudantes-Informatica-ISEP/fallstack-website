import { beforeEach, expect, test, vi } from "vitest";

import { setCompanyInterestsByName } from "../repositories/companyRepository";
import { setStudentInterests } from "../repositories/studentRepository";
import { updateUserInterests } from "./userService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/companyRepository", () => ({
  setCompanyInterestsByName: vi.fn(),
}));

vi.mock("../repositories/studentRepository", () => ({
  setStudentInterests: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("updates only the current student when no company is provided", async () => {
  await updateUserInterests({ userId: "user-1", interests: ["AI"] });

  expect(setStudentInterests).toHaveBeenCalledWith("user-1", ["AI"]);
  expect(setCompanyInterestsByName).not.toHaveBeenCalled();
});

test("updates company interests once without per-employee fan-out", async () => {
  const result = await updateUserInterests({
    userId: "employee-1",
    companyId: "company-1",
    interests: ["Web"],
  });

  expect(setCompanyInterestsByName).toHaveBeenCalledOnce();
  expect(setCompanyInterestsByName).toHaveBeenCalledWith("company-1", ["Web"]);
  expect(setStudentInterests).not.toHaveBeenCalled();
  expect(result).toEqual({ success: true });
});
