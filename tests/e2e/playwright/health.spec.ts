import { expect, test } from "@playwright/test";

test("health endpoint is available in the configured browser", async ({
  page,
}) => {
  const response = await page.goto("/api/health");

  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);
  await expect(response!.json()).resolves.toEqual({ status: 200 });
});
