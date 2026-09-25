import { expect, test } from "@playwright/test";

import { e2eEnv } from "../env";

test.describe("authenticated student event flow", () => {
  test.skip(!e2eEnv.storageState, "Set E2E_STUDENT_STORAGE_STATE.");
  test.skip(!e2eEnv.confirmNonProduction, "Set CONFIRM_NON_PRODUCTION=yes.");
  test.use({ storageState: e2eEnv.storageState! });

  test("student QR code generated", async ({ page }) => {
    const response = await page.request.get("/api/qrcode");
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.any(String),
    });
  });

  test("student uploads CV through application API", async ({ page }) => {
    test.skip(
      !e2eEnv.allowUploads,
      "Set E2E_ALLOW_UPLOADS=yes for staging upload."
    );
    test.skip(test.info().project.name !== "chromium", "Upload once per run.");
    const response = await page.request.post("/api/storage/cv", {
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

  test("CV upload rejects mismatched type and oversize content", async ({
    page,
  }) => {
    test.skip(!e2eEnv.verifyUploadLimits, "Set E2E_VERIFY_UPLOAD_LIMITS=yes.");
    test.skip(test.info().project.name !== "chromium", "Check once per run.");
    const wrongType = await page.request.post("/api/storage/cv", {
      multipart: {
        file: {
          name: "wrong.png",
          mimeType: "image/png",
          buffer: Buffer.from("%PDF-1.4\n"),
        },
      },
    });
    expect(wrongType.status()).toBe(400);
    const oversized = await page.request.post("/api/storage/cv", {
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
