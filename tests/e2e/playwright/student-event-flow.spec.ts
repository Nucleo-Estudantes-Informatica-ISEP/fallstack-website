import { expect, test } from "@playwright/test";

import { createClient } from "@supabase/supabase-js";

const storageState = process.env.E2E_STUDENT_STORAGE_STATE;
const allowUploadTickets = process.env.E2E_ALLOW_UPLOAD_TICKETS === "yes";
const verifyBucketRestrictions =
  process.env.E2E_VERIFY_BUCKET_RESTRICTIONS === "yes";
const confirmNonProduction = process.env.CONFIRM_NON_PRODUCTION === "yes";

test.describe("authenticated student event flow", () => {
  test.skip(
    !storageState,
    "Set E2E_STUDENT_STORAGE_STATE to a staging student Playwright storage-state file."
  );
  test.skip(
    !confirmNonProduction,
    "Set CONFIRM_NON_PRODUCTION=yes; never run authenticated event tests against production."
  );

  test.use({ storageState: storageState! });

  test("student QR code is generated", async ({ page }) => {
    const response = await page.request.get("/api/qrcode");

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.any(String),
    });
  });

  test("student can obtain and use a CV upload ticket", async ({ page }) => {
    test.skip(
      !allowUploadTickets,
      "Set E2E_ALLOW_UPLOAD_TICKETS=yes to create an orphaned staging CV."
    );
    test.skip(
      test.info().project.name !== "chromium",
      "Ticket coverage runs once to stay below the per-student rate limit."
    );

    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const supabaseAnonKey = process.env.E2E_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey)
      throw new Error(
        "E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY are required for direct upload verification."
      );

    const ticketResponse = await page.request.post("/api/storage/cv", {
      data: { contentType: "application/pdf", size: 44 },
    });
    expect(ticketResponse.status()).toBe(201);
    const ticket = (await ticketResponse.json()) as {
      id: string;
      path: string;
      token: string;
    };

    const storage = createClient(supabaseUrl, supabaseAnonKey);
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
      !allowUploadTickets || !verifyBucketRestrictions,
      "Set E2E_ALLOW_UPLOAD_TICKETS=yes and E2E_VERIFY_BUCKET_RESTRICTIONS=yes to verify staging bucket enforcement."
    );
    test.skip(
      test.info().project.name !== "chromium",
      "Ticket coverage runs once to stay below the per-student rate limit."
    );

    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const supabaseAnonKey = process.env.E2E_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey)
      throw new Error(
        "E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY are required for direct upload verification."
      );

    const storage = createClient(supabaseUrl, supabaseAnonKey);
    const mismatchedTicketResponse = await page.request.post("/api/storage/cv", {
      data: { contentType: "application/pdf", size: 44 },
    });
    expect(mismatchedTicketResponse.status()).toBe(201);
    const mismatchedTicket = (await mismatchedTicketResponse.json()) as {
      path: string;
      token: string;
    };
    const { error: mismatchedMimeError } = await storage.storage
      .from("cvs")
      .uploadToSignedUrl(
        mismatchedTicket.path,
        mismatchedTicket.token,
        new Blob(["not a PDF"], { type: "image/png" }),
        { contentType: "image/png" }
      );
    expect(mismatchedMimeError).not.toBeNull();

    const oversizedTicketResponse = await page.request.post("/api/storage/cv", {
      data: { contentType: "application/pdf", size: 44 },
    });
    expect(oversizedTicketResponse.status()).toBe(201);
    const oversizedTicket = (await oversizedTicketResponse.json()) as {
      path: string;
      token: string;
    };
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
