import fs from "node:fs";
import { chromium } from "@playwright/test";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ serviceWorkers: "block" });
  await page.route("**/qrcode*", (r) =>
    r.fulfill({ json: { data: "fixture-signed-token" } })
  );
  const results = [];
  try {
    for (const width of [360, 400, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://localhost:3128/responsive-check", {
        waitUntil: "networkidle",
      });
      for (const view of ["home", "signup", "profile", "pass"]) {
        console.log(width, view);
        if (
          view === "pass" &&
          !(await page
            .getByRole("region", { name: "Passe do FallStack", exact: true })
            .count())
        )
          await page
            .getByRole("button", { name: "Passe do FallStack", exact: true })
            .click();
        else
          await page
            .getByRole("button", {
              name:
                view === "home"
                  ? "Home fixture"
                  : view === "signup"
                    ? "Signup fixture"
                    : "Profile fixture",
              exact: true,
            })
            .click();
        if (view === "profile")
          await page
            .getByRole("region", { name: "Sumário", exact: true })
            .waitFor();
        if (view === "signup")
          await page
            .getByRole("heading", { name: "Criar uma conta", exact: true })
            .waitFor();
        await page.waitForTimeout(700);
        const overflow = await page.evaluate(() => ({
          viewport: innerWidth,
          body: document.documentElement.scrollWidth,
          offenders: [
            ...document.querySelectorAll("h1,h2,h3,p,button,input,table"),
          ]
            .filter((e) => {
              const r = e.getBoundingClientRect();
              return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
            })
            .map((e) => e.tagName + ":" + e.textContent.slice(0, 60)),
        }));
        if (overflow.body > width + 1 || overflow.offenders.length)
          throw Error(JSON.stringify({ width, view, ...overflow }));
        if (view === "pass") {
          await page
            .getByRole("button", { name: "Ver QR code em tamanho grande" })
            .focus();
          await page.keyboard.press("Enter");

          await page.getByRole("dialog").waitFor();
          await page.keyboard.press("Escape");
          if (await page.getByRole("dialog").count())
            throw Error("Dialog Escape failed");
        }
        results.push({ width, view, overflow: false });
        if (width === 400) {
          await page.addStyleTag({
            content: "nextjs-portal { visibility:hidden }",
          });
          if (view === "home") {
            const height = await page.evaluate(
              () => document.documentElement.scrollHeight
            );
            for (let y = 0; y < height; y += 600) {
              await page.evaluate((y) => scrollTo(0, y), y);
              await page.waitForTimeout(200);
            }
            await page
              .getByRole("button", { name: "18 de Novembro", exact: true })
              .click();
            await page.waitForTimeout(400);
            if (
              !(await page
                .getByText("Second day session", { exact: true })
                .isVisible())
            )
              throw Error("Programme day switch failed");
            await page
              .getByRole("button", { name: "17 de Novembro", exact: true })
              .click();
          }
          await page.evaluate(() => scrollTo(0, 0));
          await page.waitForTimeout(600);
          await page.screenshot({
            path: `docs/verification/issue-408/${view}-400.png`,
            fullPage: true,
          });
        }
      }
    }
    fs.writeFileSync(
      "/tmp/fallstack-408-viewports.json",
      JSON.stringify(results, null, 2)
    );
    console.log("Passed " + results.length + " viewport/page combinations");
  } catch (error) {
    await page.screenshot({
      path: "/tmp/fallstack-408-failure.png",
      fullPage: true,
    });
    console.log(
      await page
        .locator("nav[aria-label=Perfil]")
        .allTextContents()
        .catch(() => "no profile nav")
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
