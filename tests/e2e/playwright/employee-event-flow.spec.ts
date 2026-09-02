import { expect, test } from "@playwright/test";

import { e2eEnv } from "../env";
import { createRoleContext, decodeQrTokenPayload } from "../roleTestUtils";

// Proves the representative event action end-to-end against real staging
// HTTP/DB state: a Student issues their own event QR, an independently
// authenticated Employee scans it, and the Student's own history (read via
// their own session) confirms it landed. No mocked browser state involved.
test.describe("student -> employee event scan flow", () => {
  test.skip(
    !e2eEnv.storageState,
    "Set E2E_STUDENT_STORAGE_STATE to a staging student Playwright storage-state file."
  );
  test.skip(
    !e2eEnv.employeeStorageState,
    "Set E2E_EMPLOYEE_STORAGE_STATE to a staging employee Playwright storage-state file."
  );
  test.skip(
    !e2eEnv.confirmNonProduction,
    "Set CONFIRM_NON_PRODUCTION=yes; never run authenticated event tests against production."
  );

  test.use({ storageState: e2eEnv.storageState! });

  test("employee scans a student QR and the scan is reflected in the student's history", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== "chromium",
      "Runs once to avoid tripping per-account rate limits on staging."
    );

    // Student obtains their own event QR code (real staging session).
    const qrResponse = await page.request.get("/api/qrcode");
    expect(qrResponse.status()).toBe(200);
    const { data: token } = (await qrResponse.json()) as { data: string };

    const { code } = decodeQrTokenPayload(token);
    expect(code).toBeTruthy();

    // A separate, independently authenticated Employee identity scans it.
    const employeeContext = await createRoleContext("employee");
    try {
      const scanResponse = await employeeContext.post("/api/saved", {
        data: { token, comment: "e2e: staging employee scan" },
      });

      // Rerun-safe: the synthetic student may already be saved from a
      // previous suite run. A fresh scan (201) or an "already saved"
      // rejection (400) are both correct outcomes here; duplicate-effect
      // bugs are what duplicate-action.spec.ts asserts against directly.
      expect([201, 400]).toContain(scanResponse.status());
    } finally {
      await employeeContext.dispose();
    }

    // Verify against real staging state, not the Employee's own response:
    // the Student reads their own history back via their own session.
    const historyResponse = await page.request.get(
      `/api/students/${code}/history`
    );
    expect(historyResponse.status()).toBe(200);
    const history = (await historyResponse.json()) as unknown[];
    expect(history.length).toBeGreaterThan(0);
  });
});
