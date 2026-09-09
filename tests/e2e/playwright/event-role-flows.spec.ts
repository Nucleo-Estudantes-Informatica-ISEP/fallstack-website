import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";

import { e2eEnv } from "../env";
import { createRoleContext, hasRoleStates } from "../roleTestUtils";

interface SessionBody {
  role: "STUDENT" | "EMPLOYEE" | null;
  adminRole: "ADMIN" | "SUPER_ADMIN" | null;
  student: { code: string; name: string } | null;
}

interface SavedStudentBody {
  studentId: string;
  comment: string | null;
  student: { code: string };
}

async function expectSession(
  context: APIRequestContext,
  expected: Partial<SessionBody>
) {
  const response = await context.get("/api/auth/session");
  expect(response.status()).toBe(200);
  const session = (await response.json()) as SessionBody;
  expect(session).toMatchObject(expected);
  return session;
}

test.describe("staging event flows across roles", () => {
  test.skip(
    !e2eEnv.baseUrl || !e2eEnv.confirmNonProduction,
    "Set E2E_BASE_URL and CONFIRM_NON_PRODUCTION=yes for staging role tests."
  );
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== "chromium",
      "State-changing staging coverage runs once in Chromium."
    );
  });

  test("student QR -> employee scan persists once and rejects retry", async () => {
    test.skip(
      !hasRoleStates("student", "employee"),
      "Set Student and Employee storage-state files."
    );
    const student = await createRoleContext("student");
    const employee = await createRoleContext("employee");
    const marker = `e2e-${randomUUID()}`;

    try {
      const studentSession = await expectSession(student, {
        role: "STUDENT",
        adminRole: null,
      });
      await expectSession(employee, { role: "EMPLOYEE", adminRole: null });
      expect(studentSession.student).not.toBeNull();
      const code = studentSession.student!.code;

      const qrResponse = await student.get("/api/qrcode");
      expect(qrResponse.status()).toBe(200);
      const { data: token } = (await qrResponse.json()) as { data: string };

      const firstScan = await employee.post("/api/saved", {
        data: { token, comment: marker },
      });
      expect([201, 409]).toContain(firstScan.status());

      const historyResponse = await employee.get("/api/companies/history");
      expect(historyResponse.status()).toBe(200);
      const companyHistory =
        (await historyResponse.json()) as SavedStudentBody[];
      const matches = companyHistory.filter(
        (item) => item.student.code === code
      );
      expect(matches).toHaveLength(1);

      if (firstScan.status() === 409) {
        const update = await employee.put("/api/saved", {
          data: { studentId: matches[0].studentId, comment: marker },
        });
        expect(update.status()).toBe(200);
      }

      const retry = await employee.post("/api/saved", {
        data: { token, comment: `${marker}-retry` },
      });
      expect(retry.status()).toBe(409);
      await expect(retry.json()).resolves.toMatchObject({
        error: "Student already saved by your company",
      });

      const employeeReadback = await employee.get("/api/companies/history");
      expect(employeeReadback.status()).toBe(200);
      const afterRetry = (await employeeReadback.json()) as SavedStudentBody[];
      expect(afterRetry.filter((item) => item.student.code === code)).toEqual([
        expect.objectContaining({ comment: marker }),
      ]);

      const studentReadback = await student.get(
        `/api/students/${encodeURIComponent(code)}/history`
      );
      expect(studentReadback.status()).toBe(200);
      const studentHistory =
        (await studentReadback.json()) as SavedStudentBody[];
      expect(studentHistory).toContainEqual(
        expect.objectContaining({ comment: marker })
      );
    } finally {
      await Promise.all([student.dispose(), employee.dispose()]);
    }
  });

  test("admin creates and removes an isolated synthetic FAQ", async () => {
    test.skip(!hasRoleStates("admin"), "Set the Admin storage-state file.");
    const admin = await createRoleContext("admin");
    const marker = `e2e-${randomUUID()}`;
    let faqId: string | undefined;

    try {
      await expectSession(admin, { adminRole: "ADMIN" });
      const create = await admin.post("/api/admin/faqs", {
        data: {
          question: { PT: marker, EN: marker },
          answer: { PT: marker, EN: marker },
        },
      });
      expect(create.status()).toBe(201);
      faqId = ((await create.json()) as { id: string }).id;

      const list = await admin.get(
        `/api/admin/faqs?q=${encodeURIComponent(marker)}`
      );
      expect(list.status()).toBe(200);
      await expect(list.json()).resolves.toMatchObject({
        items: [expect.objectContaining({ id: faqId })],
        totalCount: 1,
      });
    } finally {
      if (faqId) {
        const cleanup = await admin.delete(`/api/admin/faqs/${faqId}`);
        expect(cleanup.status()).toBe(204);
      }
      await admin.dispose();
    }
  });

  test("Student, Employee, Admin, and Super Admin boundaries hold", async () => {
    test.skip(
      !hasRoleStates("student", "employee", "admin", "superAdmin"),
      "Set Student, Employee, Admin, and Super Admin storage-state files."
    );
    const [anonymous, student, employee, admin, superAdmin] = await Promise.all(
      [
        createRoleContext(),
        createRoleContext("student"),
        createRoleContext("employee"),
        createRoleContext("admin"),
        createRoleContext("superAdmin"),
      ]
    );

    try {
      await expectSession(student, { role: "STUDENT", adminRole: null });
      await expectSession(employee, { role: "EMPLOYEE", adminRole: null });
      await expectSession(admin, { adminRole: "ADMIN" });
      await expectSession(superAdmin, { adminRole: "SUPER_ADMIN" });

      expect((await anonymous.post("/api/saved")).status()).toBe(401);
      expect((await student.post("/api/saved")).status()).toBe(403);
      expect((await student.get("/api/admin/faqs")).status()).toBe(403);
      expect((await employee.get("/api/qrcode")).status()).toBe(403);
      expect((await employee.get("/api/admin/faqs")).status()).toBe(403);
      expect((await admin.get("/api/admin/admins")).status()).toBe(403);
      expect((await superAdmin.get("/api/admin/faqs")).status()).toBe(200);
      expect((await superAdmin.get("/api/admin/admins")).status()).toBe(200);
    } finally {
      await Promise.all([
        anonymous.dispose(),
        student.dispose(),
        employee.dispose(),
        admin.dispose(),
        superAdmin.dispose(),
      ]);
    }
  });
});
