import { beforeEach, expect, test, vi } from "vitest";

import { withTransaction } from "../repositories/transaction";
import {
  findEmployeeUserIds,
  setUserInterests,
} from "../repositories/userRepository";
import { updateUserInterests } from "./userService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/transaction", () => ({
  withTransaction: vi.fn(),
}));
vi.mock("../repositories/userRepository", () => ({
  findEmployeeUserIds: vi.fn(),
  setUserInterests: vi.fn(),
}));

const transaction = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(withTransaction).mockImplementation(async (callback) =>
    callback(transaction)
  );
});

test("updates only the current user when no company is provided", async () => {
  await updateUserInterests({ userId: "user-1", interests: ["AI"] });

  expect(setUserInterests).toHaveBeenCalledWith("user-1", ["AI"]);
  expect(findEmployeeUserIds).not.toHaveBeenCalled();
  expect(withTransaction).not.toHaveBeenCalled();
});

test("updates every company employee in one transaction", async () => {
  vi.mocked(findEmployeeUserIds).mockResolvedValue([
    "employee-1",
    "employee-2",
  ]);

  const result = await updateUserInterests({
    userId: "company-1",
    companyId: "company-1",
    interests: ["Web"],
  });

  expect(findEmployeeUserIds).toHaveBeenCalledWith("company-1");
  expect(withTransaction).toHaveBeenCalledOnce();
  expect(setUserInterests).toHaveBeenNthCalledWith(
    1,
    "employee-1",
    ["Web"],
    transaction
  );
  expect(setUserInterests).toHaveBeenNthCalledWith(
    2,
    "employee-2",
    ["Web"],
    transaction
  );
  expect(result).toEqual({ success: true });
});
