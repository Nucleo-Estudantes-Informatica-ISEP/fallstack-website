import { readFileSync } from "node:fs";
import { join } from "node:path";

import { e2eEnv } from "../env";
import { expect, test } from "./fixtures";

test.describe("authenticated student event flow", () => {
  test.skip(!e2eEnv.storageState, "Set E2E_STUDENT_STORAGE_STATE.");
  test.skip(!e2eEnv.confirmNonProduction, "Set CONFIRM_NON_PRODUCTION=yes.");
  test.use({ storageState: e2eEnv.storageState! });

  test("student QR code generated", async ({ request }) => {
    const response = await request.get("/api/qrcode");
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.any(String),
    });
  });

  test("student uploads CV through application API", async ({ request }) => {
    test.skip(
      !e2eEnv.allowUploads,
      "Set E2E_ALLOW_UPLOADS=yes for staging upload."
    );
    test.skip(test.info().project.name !== "chromium", "Upload once per run.");
    const response = await request.post("/api/storage/cv", {
      multipart: {
        file: {
          name: "sample.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4\n% test\n%%EOF\n"),
        },
      },
    });
    expect(response.status()).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: expect.any(String) });
  });

  test("near-limit and exact 10-MiB CVs survive multipart overhead and round-trip unchanged", async ({
    request,
  }) => {
    test.skip(
      !e2eEnv.allowUploads || !e2eEnv.verifyUploadLimits,
      "Opt in to upload and boundary checks."
    );
    test.skip(test.info().project.name !== "chromium", "Check once per run.");
    const session = await request.get("/api/auth/session");
    expect(session.status()).toBe(200);
    const { student } = await session.json();
    const pdf = readFileSync(join(__dirname, "../fixtures/cv.pdf"));
    const trailer = pdf.indexOf("trailer");
    for (const size of [10 * 1024 * 1024 - 1024, 10 * 1024 * 1024]) {
      const buffer = Buffer.concat([
        pdf.subarray(0, trailer),
        Buffer.from("%"),
        Buffer.alloc(size - pdf.length - 2, 0x50),
        Buffer.from("\n"),
        pdf.subarray(trailer),
      ]);
      expect(buffer.length).toBe(size);
      const upload = await request.post("/api/storage/cv", {
        multipart: {
          file: { name: "boundary.pdf", mimeType: "application/pdf", buffer },
        },
      });
      expect(upload.status()).toBe(201);
      const { id } = await upload.json();
      expect(
        (
          await request.post(`/api/students/${student.code}/cv`, {
            data: { id },
          })
        ).status()
      ).toBe(200);
      const download = await request.get(
        `/api/students/${student.code}/cv/file`
      );
      expect(download.status()).toBe(200);
      expect(await download.body()).toEqual(buffer);
    }
  });

  test("CV upload rejects mismatched type and oversize content", async ({
    request,
  }) => {
    test.skip(!e2eEnv.verifyUploadLimits, "Set E2E_VERIFY_UPLOAD_LIMITS=yes.");
    test.skip(test.info().project.name !== "chromium", "Check once per run.");
    const wrongType = await request.post("/api/storage/cv", {
      multipart: {
        file: {
          name: "wrong.png",
          mimeType: "image/png",
          buffer: Buffer.from("%PDF-1.4\n"),
        },
      },
    });
    expect(wrongType.status()).toBe(400);
    const oversized = await request.post("/api/storage/cv", {
      multipart: {
        file: {
          name: "large.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.concat([
            Buffer.from("%PDF-1.4\n"),
            Buffer.alloc(10 * 1024 * 1024),
          ]),
        },
      },
    });
    expect(oversized.status()).toBe(400);
  });
});
