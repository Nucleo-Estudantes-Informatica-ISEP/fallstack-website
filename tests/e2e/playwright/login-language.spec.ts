import { expect, test } from "./fixtures";

test("employee signup link blends into the dark login page", async ({
  page,
}) => {
  test.skip(
    process.env.EVENT_MODE === "offseason",
    "Registration is closed off season"
  );
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const link = page.getByRole("link", {
    name: "Tens um código de empresa? Regista-te como colaborador",
  });
  await expect(link).toBeVisible();
  await expect(link).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(link).toHaveCSS("text-decoration-line", "underline");
  // This legacy endpoint intentionally redirects. Verify its local destination
  // explicitly because the shared staging fixture blocks redirect chains.
  await expect(link).toHaveAttribute("href", "/signup/employee");
  const response = await page.request.get("/signup/employee", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/login?modal=employee");
  await page.goto("/login?modal=employee", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Registo de Colaborador" })
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.context().unrouteAll({ behavior: "wait" });
});

test("full homepage switches to English and back to Portuguese", async ({
  page,
}) => {
  test.skip(
    process.env.SHOWCASE_FULL_WEBSITE !== "true" ||
      process.env.EVENT_MODE === "offseason",
    "Requires the active full event website"
  );
  await page.goto("/event/pt", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Programa do evento" })
  ).toBeVisible();
  // The account action appears only after the client session has resolved,
  // so the language control is hydrated before interacting with it.
  await expect(
    page.getByRole("link", { name: "Quero registar-me no evento" })
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Selecionar idioma / Select language" })
    .click();
  await page.getByRole("menuitem", { name: "English EN" }).click();
  await expect(page).toHaveURL(/\/event\/en$/);
  await expect(
    page.getByRole("button", { name: "Selecionar idioma / Select language" })
  ).toHaveText("EN");
  await expect(
    page.getByRole("heading", { name: "Event programme" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "17 November", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add to my calendar" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Business Dinner" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "FallStack Pass" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Need help?" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Privacy Policy" })
  ).toHaveAttribute("href", "/privacy-policy");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/event\/en$/);
  await expect(
    page.getByRole("heading", { name: "Event programme" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Selecionar idioma / Select language" })
    .click();
  await page.getByRole("menuitem", { name: "Português PT" }).click();
  await expect(page).toHaveURL(/\/event\/pt$/);
  await expect(
    page.getByRole("heading", { name: "Programa do evento" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jantar Empresarial" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Selecionar idioma / Select language" })
  ).toHaveText("PT");
  await page.evaluate(() => document.fonts.ready);
  await page.context().unrouteAll({ behavior: "wait" });
});

for (const account of [
  {
    name: "student",
    user: {
      role: "STUDENT",
      adminRole: null,
      student: { code: "AB12", name: "Ana" },
    },
    profileLabel: "My profile",
    portugueseLabel: "O meu perfil",
    href: "/student/AB12",
    scanner: false,
  },
  {
    name: "admin",
    user: { role: null, adminRole: "ADMIN", student: null },
    profileLabel: "Admin area",
    portugueseLabel: "Área de administração",
    href: "/overview",
    scanner: true,
  },
  {
    name: "staff",
    user: { role: null, adminRole: null, student: null, neiMember: true },
    profileLabel: "Attendance scanner",
    portugueseLabel: "Scanner de presenças",
    href: "/attendance/scan",
    scanner: true,
  },
]) {
  test(`signed-in English navigation is accessible for ${account.name}`, async ({
    page,
  }) => {
    test.skip(
      process.env.SHOWCASE_FULL_WEBSITE !== "true" ||
        process.env.EVENT_MODE === "offseason",
      "Requires the active full event website"
    );
    // Exercise the real public page with a synthetic browser session response;
    // no privileged cookie or protected endpoint is needed for navigation labels.
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: account.user })
    );
    await page.goto("/event/en", { waitUntil: "domcontentloaded" });
    const navigation = page.getByRole("navigation");
    await expect(navigation).toHaveAttribute("lang", "en");
    await expect(
      navigation.getByRole("link", { name: account.profileLabel, exact: true })
    ).toHaveAttribute("href", account.href);
    await expect(
      navigation.getByRole("button", { name: "Sign out", exact: true })
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Attendance scanner", exact: true })
    ).toHaveCount(account.scanner ? 1 : 0);

    await navigation
      .getByRole("button", { name: "Selecionar idioma / Select language" })
      .click();
    await page.getByRole("menuitem", { name: "Português PT" }).click();
    await expect(page).toHaveURL(/\/event\/pt$/);
    await expect(navigation).toHaveAttribute("lang", "pt");
    await expect(
      navigation.getByRole("link", {
        name: account.portugueseLabel,
        exact: true,
      })
    ).toHaveAttribute("href", account.href);
    await expect(
      navigation.getByRole("button", { name: "Terminar sessão", exact: true })
    ).toBeVisible();
    await expect(
      navigation.getByRole("button", { name: "Sign out", exact: true })
    ).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await page.context().unrouteAll({ behavior: "wait" });
  });
}
