/* eslint-disable @next/next/no-head-element, @next/next/no-css-tags, @next/next/no-img-element -- standalone HTML artifact, outside Next */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import EditionIntroduction from "../src/components/EditionIntroduction";
import {
  deploymentMode,
  futureEditionStart,
} from "../src/config/deploymentMode";
import { branding } from "../src/edition/branding";

async function main() {
  const mode = deploymentMode(process.env.DEPLOYMENT_MODE);
  if (mode === "EVENT") {
    const result = spawnSync("pnpm", ["build"], { stdio: "inherit" });
    if (result.error) throw result.error;
    process.exit(result.status ?? 1);
  }
  // No application, env loader, DB client, session or storage imports in this build.
  const start = futureEditionStart(process.env.EDITION_STARTS_AT, Date.now());
  await mkdir("static-output/assets", { recursive: true });
  await copyFile(
    "public/assets/images/logo-white.png",
    "static-output/assets/logo.png"
  );
  await copyFile(
    "public/assets/images/logo-simplified-white.png",
    "static-output/assets/nei.png"
  );
  for (const name of ["landing.css", "landing.js", "sw.js"])
    await copyFile(`deployment/static/${name}`, `static-output/${name}`);
  await writeFile(
    "static-output/index.html",
    "<!doctype html>" +
      renderToStaticMarkup(
        <html lang="pt-PT">
          <head>
            <meta charSet="utf-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <title>{branding.name}</title>
            <link rel="stylesheet" href="/landing.css" />
            <script src="/landing.js" defer />
          </head>
          <body>
            <header>
              <img src="/assets/logo.png" alt="NEI ISEP" width="220" />
            </header>
            <main>
              <h1>{branding.name}</h1>
              <EditionIntroduction language="PT" />
              <p>
                O encontro de estudantes e empresas de Informática no{" "}
                {branding.event.venue}.
              </p>
              <p id="countdown" role="timer" data-start={start ?? ""}>
                Novidades sobre a próxima edição em breve.
              </p>
            </main>
            <footer>
              <img src="/assets/nei.png" width="90" alt="NEI ISEP" />
              <p>Organização do Núcleo de Estudantes de Informática do ISEP</p>
              <a href="https://www.instagram.com/nei_isep/">Instagram</a>
            </footer>
          </body>
        </html>
      )
  );
  await writeFile(
    "static-output/404.html",
    "<!doctype html><html lang='pt'><title>Indisponível</title><h1>Página indisponível</h1><a href='/'>Fallstack</a></html>"
  );
  console.log(`${mode}: static-output (no runtime application dependencies)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
