import { e2eEnv } from "../env";
import { expect, test } from "./fixtures";

test.describe("company history pagination", () => {
  test.skip(
    !e2eEnv.employeeStorageState || !e2eEnv.confirmNonProduction,
    "Set E2E_EMPLOYEE_STORAGE_STATE and CONFIRM_NON_PRODUCTION=yes with at least 16 saved profiles."
  );
  test.use({ storageState: e2eEnv.employeeStorageState! });

  test("loads every saved profile without duplicates using the value cursor", async ({
    page,
    request,
  }) => {
    const full = await request.get("/api/companies/history");
    expect(full.status()).toBe(200);
    const history = (await full.json()) as { student: { code: string } }[];
    expect(history.length, "Seed at least 16 company saves").toBeGreaterThan(
      15
    );
    const response = await page.goto("/dashboard");
    expect(response!.status()).toBe(200);
    const profiles = page.locator('a[href^="/student/"][href$="/preview"]');
    await expect(profiles).toHaveCount(15);
    for (let loaded = 15; loaded < history.length; loaded += 15) {
      const nextPage = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/companies/history/page"
      );
      await page
        .getByRole("button", { name: "Carregar mais", exact: true })
        .click();
      const next = await nextPage;
      expect(next.status()).toBe(200);
      expect(new URL(next.url()).searchParams.get("createdAt")).toMatch(
        /^\d{4}-.*Z$/
      );
      await expect(profiles).toHaveCount(Math.min(loaded + 15, history.length));
    }
    await expect(
      page.getByRole("button", { name: "Carregar mais", exact: true })
    ).toHaveCount(0);
    const links = await profiles.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href"))
    );
    expect(new Set(links).size).toBe(history.length);
    expect(links.sort()).toEqual(
      history.map((row) => `/student/${row.student.code}/preview`).sort()
    );
    await page.screenshot({
      path: test.info().outputPath("company-history.png"),
      fullPage: true,
    });
  });
});
