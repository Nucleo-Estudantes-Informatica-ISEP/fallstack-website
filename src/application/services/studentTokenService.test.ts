import jwt from "jsonwebtoken";
import { beforeEach, expect, test, vi } from "vitest";

import { findStudentByCode } from "../repositories/studentRepository";
import { jwtStudent } from "./studentTokenService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/studentRepository", () => ({
  findStudentByCode: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findStudentByCode).mockResolvedValue({ id: "student" } as never);
});
const sign = (
  purpose: string,
  options: jwt.SignOptions = { expiresIn: 1800 }
) => jwt.sign({ code: "A6XDEF", purpose }, process.env.JWT_SECRET!, options);

test.each(["attendance", "student-pass"])(
  "exchanges a valid %s QR for a scoped preview",
  async (purpose) => {
    const token = await jwtStudent({ token: sign(purpose) });
    expect(findStudentByCode).toHaveBeenCalledWith("A6XDEF");
    expect(jwt.verify(token!, process.env.JWT_SECRET!)).toMatchObject({
      code: "A6XDEF",
      purpose: "student-pass",
    });
  }
);
test.each([
  () => sign("attendance", { expiresIn: -1 }),
  () => sign("attendance", { algorithm: "HS384", expiresIn: 1800 }),
  () => sign("action"),
  () => sign("attendance", {}),
  () => sign("attendance") + "tampered",
  () => "not-a-jwt",
])(
  "rejects expired, wrong-purpose, unbounded and tampered credentials",
  async (create) => {
    expect(await jwtStudent({ token: create() })).toBeNull();
    expect(findStudentByCode).not.toHaveBeenCalled();
  }
);
test("does not exchange a pass for a deleted student", async () => {
  vi.mocked(findStudentByCode).mockResolvedValue(null);
  expect(await jwtStudent({ token: sign("attendance") })).toBeNull();
});
