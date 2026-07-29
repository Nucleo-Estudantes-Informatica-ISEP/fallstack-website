import { expect, test } from "@playwright/test";

test("health endpoint is available", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: 200 });
});
