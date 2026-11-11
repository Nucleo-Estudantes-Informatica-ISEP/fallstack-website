import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";

import {
  collectCopies,
  copyOf,
  probeAttempts,
  repeatOnOtherCopy,
} from "../copyUtils";
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

  test("a QR token issued on one copy scans once and is refused on every copy", async () => {
    test.skip(
      !hasRoleStates("student", "employee"),
      "Set Student and Employee storage-state files."
    );
    const student = await createRoleContext("student");
    const employee = await createRoleContext("employee");
    const marker = `e2e-${randomUUID()}`;
    const attempts = probeAttempts(copies) * 2;

    try {
      const { body } = await sessionOn(student, "STUDENT");
      const code = body.student!.code;
      await sessionOn(employee, "EMPLOYEE");

      const savedCount = async () => {
        const response = await employee.get("/api/companies/history");
        expect(response.status()).toBe(200);
        return ((await response.json()) as SavedStudentBody[]).filter(
          (item) => item.student.code === code
        ).length;
      };
      // The first scan must create the save, so the pair must start unsaved.
      // A save cannot be undone through the API: use a Student that the
      // Employee's company has not saved, or remove the row first.
      expect(
        await savedCount(),
        `Student ${code} is already saved by the Employee's company. Use a Student that is not saved, or remove the save, so the first scan has to succeed.`
      ).toBe(0);

      const qr = await student.get("/api/qrcode");
      expect(qr.status()).toBe(200);
      const issuedOn = copyOf(qr);
      const { data: token } = (await qr.json()) as { data: string };

      // The first scan changes state, so it cannot be repeated until it lands
      // on another copy. It is checked on the copy that answered it.
      const first = await employee.post("/api/saved", {
        data: { token, comment: marker },
      });
      expect(first.status()).toBe(201);
      const scannedOn = copyOf(first);

      // The refusal is safe to repeat: every copy must verify the token issued
      // on `issuedOn`, see the save written on `scannedOn`, and refuse it.
      const refusedOn = await collectCopies(
        () =>
          employee.post("/api/saved", {
            data: { token, comment: `${marker}-retry` },
          }),
        copies,
        attempts,
        async (retry) => {
          expect(retry.status()).toBe(409);
          await expect(retry.json()).resolves.toMatchObject({
            error: "Student already saved by your company",
          });
        }
      );
      expect(
        refusedOn.size,
        `Retry was refused on ${refusedOn.size} of ${copies} copies (issued on ${issuedOn}, scanned on ${scannedOn}).`
      ).toBe(copies);

      expect(await savedCount()).toBe(1);
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

      // Attaching the same object is idempotent, so repeat it until another
      // copy than the upload's answers it.
      const attach = await repeatOnOtherCopy(
        () => student.post(`/api/students/${code}/cv`, { data: { id } }),
        copyOf(upload),
        attempts
      );
      expect(attach.status()).toBe(200);

      const download = await repeatOnOtherCopy(
        () => student.get(`/api/students/${code}/cv/file`),
        copyOf(attach),
        attempts
      );
      expect(download.status()).toBe(200);
      expect(Buffer.compare(await download.body(), pdf)).toBe(0);

      const deniedOn = await collectCopies(
        () => anonymous.get(`/api/students/${code}/cv/file`),
        copies,
        attempts * 2,
        (denied) => expect(denied.status()).toBe(401)
      );
      expect(deniedOn.size, "anonymous requests denied on every copy").toBe(
        copies
      );

      const foreignOn = await collectCopies(
        () => student.get(`/api/students/e2e-${randomUUID()}/cv/file`),
        copies,
        attempts * 2,
        (foreign) => expect(foreign.status()).toBe(404)
      );
      expect(foreignOn.size, "foreign-code requests denied on every copy").toBe(
        copies
      );
    } finally {
      await Promise.all([student.dispose(), anonymous.dispose()]);
    }
  });
});
