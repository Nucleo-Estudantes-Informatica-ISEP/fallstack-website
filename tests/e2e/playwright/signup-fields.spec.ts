import { e2eEnv } from "../env";
import { expect, test } from "./fixtures";

test("anonymous signup starts with AuthNEI even on the legacy callback URL", async ({
  page,
}) => {
  await page.goto("/signup?authnei=1");

  await expect(
    page.getByRole("button", { name: "Continuar com AuthNEI" })
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Qual é o teu nome?" })
  ).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.context().unrouteAll({ behavior: "wait" });
});

test.describe("signup after AuthNEI", () => {
  test.use({ storageState: e2eEnv.signupStorageState });
  test("signup fields stay usable while moving through the wizard", async ({
    page,
  }) => {
    test.skip(
      !e2eEnv.signupStorageState,
      "Requires a student session without a local profile"
    );
    await page.goto("/signup");
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Email institucional" })
    ).toHaveAttribute("readonly", "");

    const step = page.getByRole("region", { name: "Registo de estudante" });
    const year = step.getByRole("combobox", { name: "Seleciona o teu ano" });
    const next = step.getByRole("button", { name: "Seguinte", exact: true });

    await expect(year).toBeVisible();
    await next.click();
    await expect(year).toHaveAccessibleDescription(
      "Por favor, seleciona o teu ano."
    );
    await year.selectOption({ label: "1º Ano - Licenciatura" });

    await next.click();
    await expect(step).toBeFocused();
    const bio = step.getByRole("textbox", { name: /Conta-nos mais sobre ti/ });
    await bio.fill("Texto");
    await expect(bio).toHaveAccessibleDescription("5 / 255 caracteres");
    await expect(bio).toHaveCSS(
      "height",
      (page.viewportSize()?.width ?? 0) >= 1024 ? "264px" : "160px"
    );

    await next.click();
    await expect(step).toBeFocused();
    await expect(
      step.getByRole("group", { name: /Escolhe os teus interesses/ })
    ).toBeVisible();

    await next.click();
    await expect(step).toBeFocused();

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
    await page.evaluate(() => document.fonts.ready);
    await page.context().unrouteAll({ behavior: "wait" });
  });
});
