import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";

import { copyOf, probeAttempts, untilOtherCopy } from "../copyUtils";
import { e2eEnv } from "../env";
import { createRoleContext, hasRoleStates } from "../roleTestUtils";
import { expect, test } from "./fixtures";

// Proves that successive requests behave the same on every web copy (#456).
// Run against a load balancer (and again through Cloudflare) that fronts
// E2E_EXPECTED_COPIES web copies built from one image with one set of secrets.

const copies = e2eEnv.expectedCopies ?? 0;

interface SessionBody {
  role: "STUDENT" | "EMPLOYEE" | null;
  student: { code: string } | null;
}

interface SavedStudentBody {
  student: { code: string };
}

async function sessionOn(context: APIRequestContext, expected: string) {
  const response = await context.get("/api/auth/session");
  expect(response.status()).toBe(200);
  expect(copyOf(response)).toBeTruthy();
  const body = (await response.json()) as SessionBody;
  expect(body.role).toBe(expected);
  return { body, copy: copyOf(response) };
}

test.describe("requests behave the same on every web copy", () => {
  test.skip(
    !e2eEnv.baseUrl || !e2eEnv.confirmNonProduction || copies < 2,
    "Set E2E_BASE_URL, CONFIRM_NON_PRODUCTION=yes and E2E_EXPECTED_COPIES (2 or more)."
  );
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== "chromium",
      "State-changing multi-copy coverage runs once in Chromium."
    );
  });

  test("the proxy reaches every expected copy", async () => {
    const anonymous = await createRoleContext();
    try {
      const seen = new Set<string>();
      for (let i = 0; i < copies * 10; i += 1)
        seen.add(copyOf(await anonymous.get("/api/health")));
      expect(seen.size).toBe(copies);
    } finally {
      await anonymous.dispose();
    }
  });

  test("a student session is valid on every copy", async () => {
    test.skip(!hasRoleStates("student"), "Set the Student storage-state file.");
    const student = await createRoleContext("student");
    try {
      const seen = new Set<string>();
      let code: string | undefined;
      for (let i = 0; i < copies * 4; i += 1) {
        const { body, copy } = await sessionOn(student, "STUDENT");
        seen.add(copy);
        code ??= body.student?.code;
        expect(body.student?.code).toBe(code);
      }
      expect(seen.size).toBe(copies);
    } finally {
      await student.dispose();
    }
  });

  test("a QR token issued on one copy scans once on another", async () => {
    test.skip(
      !hasRoleStates("student", "employee"),
      "Set Student and Employee storage-state files."
    );
    const student = await createRoleContext("student");
    const employee = await createRoleContext("employee");
    const marker = `e2e-${randomUUID()}`;
    const attempts = probeAttempts(copies);

    try {
      const { body } = await sessionOn(student, "STUDENT");
      const code = body.student!.code;
      await sessionOn(employee, "EMPLOYEE");

      const savedBefore = async () => {
        const response = await employee.get("/api/companies/history");
        expect(response.status()).toBe(200);
        return ((await response.json()) as SavedStudentBody[]).filter(
          (item) => item.student.code === code
        ).length;
      };
      const initial = await savedBefore();
      expect(initial).toBeLessThanOrEqual(1);

      const qr = await student.get("/api/qrcode");
      expect(qr.status()).toBe(200);
      const issuedOn = copyOf(qr);
      const { data: token } = (await qr.json()) as { data: string };

      const scanCopy = await untilOtherCopy(employee, issuedOn, attempts);
      expect(scanCopy).not.toBe(issuedOn);
      const first = await employee.post("/api/saved", {
        data: { token, comment: marker },
      });
      expect(first.status()).toBe(initial ? 409 : 201);
      const scannedOn = copyOf(first);

      await untilOtherCopy(employee, scannedOn, attempts);
      const retry = await employee.post("/api/saved", {
        data: { token, comment: `${marker}-retry` },
      });
      expect(retry.status()).toBe(409);
      expect(copyOf(retry)).not.toBe(scannedOn);
      await expect(retry.json()).resolves.toMatchObject({
        error: "Student already saved by your company",
      });

      expect(await savedBefore()).toBe(1);
    } finally {
      await Promise.all([student.dispose(), employee.dispose()]);
    }
  });

  test("a CV uploaded on one copy is served by another, and stays private", async () => {
    test.skip(!e2eEnv.allowUploads, "Set E2E_ALLOW_UPLOADS=yes for uploads.");
    test.skip(!hasRoleStates("student"), "Set the Student storage-state file.");
    const student = await createRoleContext("student");
    const anonymous = await createRoleContext();
    const attempts = probeAttempts(copies);
    const pdf = Buffer.from(`%PDF-1.4\n% ${randomUUID()}\n%%EOF\n`);

    try {
      const { body } = await sessionOn(student, "STUDENT");
      const code = encodeURIComponent(body.student!.code);

      const upload = await student.post("/api/storage/cv", {
        multipart: {
          file: {
            name: "multi-copy.pdf",
            mimeType: "application/pdf",
            buffer: pdf,
          },
        },
      });
      expect(upload.status()).toBe(201);
      const { id } = (await upload.json()) as { id: string };

      await untilOtherCopy(student, copyOf(upload), attempts);
      const attach = await student.post(`/api/students/${code}/cv`, {
        data: { id },
      });
      expect(attach.status()).toBe(200);

      await untilOtherCopy(student, copyOf(attach), attempts);
      const download = await student.get(`/api/students/${code}/cv/file`);
      expect(download.status()).toBe(200);
      expect(Buffer.compare(await download.body(), pdf)).toBe(0);

      const seen = new Set<string>();
      for (let i = 0; i < copies * 3; i += 1) {
        const denied = await anonymous.get(`/api/students/${code}/cv/file`);
        expect(denied.status()).toBe(401);
        seen.add(copyOf(denied));
        const foreign = await student.get(
          `/api/students/e2e-${randomUUID()}/cv/file`
        );
        expect(foreign.status()).toBe(404);
        seen.add(copyOf(foreign));
      }
      expect(seen.size).toBe(copies);
    } finally {
      await Promise.all([student.dispose(), anonymous.dispose()]);
    }
  });
});
