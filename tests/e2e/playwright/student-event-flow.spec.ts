import { expect, test, type APIRequestContext } from "@playwright/test";

import { e2eEnv } from "../env";

import { createClient } from "@supabase/supabase-js";

const CV_SAMPLE_SIZE = 44;

function createStagingSupabaseClient() {
  if (!e2eEnv.supabaseUrl || !e2eEnv.supabaseAnonKey)
    throw new Error(
      "E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY are required for direct upload verification."
    );
  return createClient(e2eEnv.supabaseUrl, e2eEnv.supabaseAnonKey);
}

async function requestCvTicket(request: APIRequestContext) {
  const response = await request.post("/api/storage/cv", {
    data: { contentType: "application/pdf", size: CV_SAMPLE_SIZE },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as {
    id: string;
    path: string;
    token: string;
  };
}

test.describe("authenticated student event flow", () => {
  test.skip(
    !e2eEnv.storageState,
    "Set E2E_STUDENT_STORAGE_STATE to a staging student Playwright storage-state file."
  );
  test.skip(
    !e2eEnv.confirmNonProduction,
    "Set CONFIRM_NON_PRODUCTION=yes; never run authenticated event tests against production."
  );

  test.use({ storageState: e2eEnv.storageState! });

  test("student QR code is generated", async ({ page }) => {
    const response = await page.request.get("/api/qrcode");

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.any(String),
    });
  });

  test("student can obtain and use a CV upload ticket", async ({ page }) => {
    test.skip(
      !e2eEnv.allowUploadTickets,
      "Set E2E_ALLOW_UPLOAD_TICKETS=yes to create an orphaned staging CV."
    );
    test.skip(
      test.info().project.name !== "chromium",
      "Ticket coverage runs once to stay below the per-student rate limit."
    );

    const ticket = await requestCvTicket(page.request);
    const storage = createStagingSupabaseClient();
    const { error } = await storage.storage.from("cvs").uploadToSignedUrl(
      ticket.path,
      ticket.token,
      new Blob(["%PDF-1.4\n% staging event test\n%%EOF\n"], {
        type: "application/pdf",
      }),
      { contentType: "application/pdf" }
    );

    expect(error).toBeNull();
  });

  test("CV bucket rejects mismatched MIME types and oversized files", async ({
    page,
  }) => {
    test.skip(
      !e2eEnv.allowUploadTickets || !e2eEnv.verifyBucketRestrictions,
      "Set E2E_ALLOW_UPLOAD_TICKETS=yes and E2E_VERIFY_BUCKET_RESTRICTIONS=yes to verify staging bucket enforcement."
    );
    test.skip(
      test.info().project.name !== "chromium",
      "Ticket coverage runs once to stay below the per-student rate limit."
    );

    const storage = createStagingSupabaseClient();
    const mismatchedTicket = await requestCvTicket(page.request);
    const { error: mismatchedMimeError } = await storage.storage
      .from("cvs")
      .uploadToSignedUrl(
        mismatchedTicket.path,
        mismatchedTicket.token,
        new Blob(["not a PDF"], { type: "image/png" }),
        { contentType: "image/png" }
      );
    expect(mismatchedMimeError).not.toBeNull();

    const oversizedTicket = await requestCvTicket(page.request);
    const { error: oversizedFileError } = await storage.storage
      .from("cvs")
      .uploadToSignedUrl(
        oversizedTicket.path,
        oversizedTicket.token,
        new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], {
          type: "application/pdf",
        }),
        { contentType: "application/pdf" }
      );
    expect(oversizedFileError).not.toBeNull();
  });
});
