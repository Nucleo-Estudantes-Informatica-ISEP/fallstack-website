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
const AI_ID = "00000000-0000-4000-8000-000000000001";
const WEB_ID = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(withTransaction).mockImplementation(async (callback) =>
    callback(transaction)
  );
});

test("updates only the current user when no company is provided", async () => {
  await updateUserInterests({ userId: "user-1", interests: [AI_ID] });

  expect(setUserInterests).toHaveBeenCalledWith("user-1", [AI_ID]);
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
    interests: [WEB_ID],
  });

  expect(findEmployeeUserIds).toHaveBeenCalledWith("company-1");
  expect(withTransaction).toHaveBeenCalledOnce();
  expect(setUserInterests).toHaveBeenNthCalledWith(
    1,
    "employee-1",
    [WEB_ID],
    transaction
  );
  expect(setUserInterests).toHaveBeenNthCalledWith(
    2,
    "employee-2",
    [WEB_ID],
    transaction
  );
  expect(result).toEqual({ success: true });
});
