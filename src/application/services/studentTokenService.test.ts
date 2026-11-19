import jwt from "jsonwebtoken";
import { beforeEach, expect, test, vi } from "vitest";

import { findStudentByCode } from "../repositories/studentRepository";
import { jwtStudent, studentCodeFromPreview } from "./studentTokenService";

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
) =>
  jwt.sign(
    { code: "A6XDEF", purpose, companyId: "c1" },
    process.env.JWT_SECRET!,
    options
  );

test.each(["attendance", "student-pass"])(
  "exchanges a valid %s QR for a scoped preview",
  async (purpose) => {
    const preview = await jwtStudent({ token: sign(purpose) }, "c1");
    expect(findStudentByCode).toHaveBeenCalledWith("A6XDEF");
    expect(jwt.verify(preview!.token, process.env.JWT_SECRET!)).toMatchObject({
      code: "A6XDEF",
      purpose: "student-pass",
      companyId: "c1",
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
    expect(await jwtStudent({ token: create() }, "c1")).toBeNull();
    expect(findStudentByCode).not.toHaveBeenCalled();
  }
);
test("does not exchange a pass for a deleted student", async () => {
  vi.mocked(findStudentByCode).mockResolvedValue(null);
  expect(await jwtStudent({ token: sign("attendance") }, "c1")).toBeNull();
});

test("requires the issuing company when exchanging or consuming a preview", async () => {
  const preview = await jwtStudent("A6XDEF", "c1");
  expect(studentCodeFromPreview(preview?.token, "c1")).toBe("A6XDEF");
  expect(studentCodeFromPreview(preview?.token, "c2")).toBeNull();
  expect(await jwtStudent({ token: preview!.token }, "c2")).toBeNull();
  expect(studentCodeFromPreview(sign("attendance"), "c1")).toBeNull();
});
