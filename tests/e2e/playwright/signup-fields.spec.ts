import { expect, test } from "./fixtures";

test("signup fields stay usable while moving through the wizard", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "authnei-signup-draft",
      JSON.stringify({ name: "Estudante de teste" })
    );
  });
  const sessionResponse = page.waitForResponse("**/api/auth/session");
  await page.goto("/signup?authnei=1");
  await sessionResponse;
  await page.evaluate(() => document.fonts.ready);

  const step = page.getByRole("region", { name: "Registo de estudante" });
  const year = step.getByRole("combobox", { name: "Seleciona o teu ano" });
  const next = step.getByRole("button", { name: "Seguinte", exact: true });

  await expect(year).toBeVisible();
  await next.click();
  await expect(year).toHaveAccessibleDescription(
    "Por favor, seleciona o teu ano."
  );
  await year.selectOption({ label: "1º Ano - Licenciatura" });

  for (let advance = 0; advance < 3; advance++) {
    await next.click();
    await expect(step).toBeFocused();
  }

  const cv = step.getByLabel("Insere o teu CV. (Opcional)", { exact: true });
  const avatar = step.getByLabel(
    "Insere uma imagem para foto de perfil. (Opcional)",
    { exact: true }
  );
  const linkedin = step.getByRole("textbox", { name: /LinkedIn/ });
  const finish = step.getByRole("button", { name: "Concluir", exact: true });

  await expect(linkedin).toHaveCSS("font-size", "16px");
  const controls = [cv.locator(".."), avatar.locator(".."), linkedin];
  const boxes = await Promise.all(
    controls.map((control) => control.boundingBox())
  );
  const linkedinBox = boxes[2]!;
  for (const box of boxes) {
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeCloseTo(linkedinBox.height, 0);
    expect(box!.width).toBeCloseTo(linkedinBox.width, 0);
    expect(box!.x).toBeCloseTo(linkedinBox.x, 0);
  }

  await cv.focus();
  await expect(cv).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(avatar).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(linkedin).toBeFocused();
  await expect(linkedin).toBeInViewport();

  await finish.click();
  await expect(step.getByRole("alert")).toHaveText(
    "Tens de aceitar a política de privacidade."
  );
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  ).resolves.toBe(true);
});
