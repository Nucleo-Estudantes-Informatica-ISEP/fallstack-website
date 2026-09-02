import { expect, test } from "@playwright/test";

import { e2eEnv } from "../env";
import { createRoleContext } from "../roleTestUtils";

// Asserts that a retried/duplicated event action is rejected, not
// re-applied. Deliberately does not assume a pristine starting state:
// the first call may legitimately be a no-op (already saved from an
// earlier run) as long as the *retry* is always rejected.
test.describe("duplicate event-action retry protection", () => {
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

  test("scanning the same student twice does not create a duplicate save", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== "chromium",
      "Runs once to avoid tripping per-account rate limits on staging."
    );

    const qrResponse = await page.request.get("/api/qrcode");
    expect(qrResponse.status()).toBe(200);
    const { data: token } = (await qrResponse.json()) as { data: string };

    const employeeContext = await createRoleContext("employee");
    try {
      // Baseline: fresh scan (201) or already-saved from a prior run (400)
      // — both are valid starting points for this test.
      const first = await employeeContext.post("/api/saved", {
        data: { token, comment: "e2e: duplicate-retry setup" },
      });
      expect([201, 400]).toContain(first.status());

      // Immediate retry with the exact same token, simulating a network
      // retry or a double-tap on the scanner device: must be rejected.
      const second = await employeeContext.post("/api/saved", {
        data: { token, comment: "e2e: duplicate-retry attempt" },
      });
      expect(second.status()).toBe(400);

      const body = (await second.json()) as { error?: string };
      expect(body.error).toBeTruthy();
    } finally {
      await employeeContext.dispose();
    }
  });
});
