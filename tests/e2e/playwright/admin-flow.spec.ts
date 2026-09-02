import { expect, test } from "@playwright/test";

import { e2eEnv } from "../env";

// Representative Admin operation against real staging state. Toggles a
// synthetic action's live status and immediately toggles it back, so the
// run is self-reverting and safe to repeat against shared staging data.
test.describe("admin event-action management", () => {
  test.skip(
    !e2eEnv.adminStorageState,
    "Set E2E_ADMIN_STORAGE_STATE to a staging admin Playwright storage-state file."
  );
  test.skip(
    !e2eEnv.confirmNonProduction,
    "Set CONFIRM_NON_PRODUCTION=yes; never run authenticated event tests against production."
  );

  test.use({ storageState: e2eEnv.adminStorageState! });

  test("admin can toggle a synthetic event action's live status", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== "chromium",
      "Runs once to avoid concurrently mutating shared staging action state."
    );

    const listResponse = await page.request.get("/api/admin/actions");
    expect(listResponse.status()).toBe(200);
    const actions = (await listResponse.json()) as Array<{ id: string }>;
    expect(actions.length).toBeGreaterThan(0);
    const actionId = actions[0].id;

    const firstToggle = await page.request.patch(`/api/actions/${actionId}`);
    expect(firstToggle.status()).toBe(200);

    // Toggle back to leave staging state unchanged for the next run.
    const secondToggle = await page.request.patch(`/api/actions/${actionId}`);
    expect(secondToggle.status()).toBe(200);
  });
});
