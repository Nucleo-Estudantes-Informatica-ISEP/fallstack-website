import { expect, test } from "@playwright/test";

import { createClient } from "@supabase/supabase-js";

const storageState = process.env.E2E_STUDENT_STORAGE_STATE;
const allowUploadTickets = process.env.E2E_ALLOW_UPLOAD_TICKETS === "yes";
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

  test("student QR code is generated", async ({ request }) => {
    const response = await request.get("/api/qrcode");

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.any(String),
    });
  });

  test("student can obtain and use a CV upload ticket", async ({ request }) => {
    test.skip(
      !allowUploadTickets,
      "Set E2E_ALLOW_UPLOAD_TICKETS=yes to create an orphaned staging CV."
    );

    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const supabaseAnonKey = process.env.E2E_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey)
      throw new Error(
        "E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY are required for direct upload verification."
      );

    const ticketResponse = await request.post("/api/storage/cv", {
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
});
