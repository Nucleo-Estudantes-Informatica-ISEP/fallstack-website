import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

// The class of bug this guards against: a NEXT_PUBLIC_* var gets added to
// src/config/env.client.ts (so it's picked up at *runtime* by anything
// reading process.env directly, and by `pnpm dev`/`pnpm build` locally),
// but Next.js actually inlines NEXT_PUBLIC_* vars into the browser bundle
// at *build* time - so a Docker build that never receives it as a build
// arg silently ships a blank value in production, however correctly it's
// set in the deploy environment's .env. This has already happened once
// (NEXT_PUBLIC_BASE_URL) and a second time (NEXT_PUBLIC_LOGS_DASHBOARD_URL,
// added for the admin backoffice's Logs link) before this test existed.
const ROOT = path.resolve(__dirname, "../..");

function readClientEnvVarNames(): string[] {
  const source = readFileSync(
    path.join(ROOT, "src/config/env.client.ts"),
    "utf-8"
  );
  const matches = source.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g);
  return [...new Set([...matches].map((match) => match[0]))];
}

function extractDockerfileAppBuilderStage(): string {
  const dockerfile = readFileSync(path.join(ROOT, "Dockerfile"), "utf-8");
  const start = dockerfile.indexOf("FROM builder AS app-builder");
  if (start === -1) {
    throw new Error(
      "Couldn't find the `app-builder` stage in the Dockerfile - has it been renamed?"
    );
  }
  const nextStage = dockerfile.indexOf("\nFROM ", start + 1);
  return dockerfile.slice(start, nextStage === -1 ? undefined : nextStage);
}

function extractComposeWebBuildArgs(): string {
  const compose = readFileSync(
    path.join(ROOT, "docker-compose.app.yml"),
    "utf-8"
  );
  const lines = compose.split("\n");
  const argsLineIndex = lines.findIndex((line) => line.trim() === "args:");
  if (argsLineIndex === -1) {
    throw new Error(
      "Couldn't find a top-level `args:` block in docker-compose.app.yml - has the web service's build config been restructured?"
    );
  }
  const argsIndent = lines[argsLineIndex].search(/\S/);
  const blockLines: string[] = [];
  for (const line of lines.slice(argsLineIndex + 1)) {
    if (line.trim() === "") continue;
    const indent = line.search(/\S/);
    if (indent <= argsIndent) break;
    blockLines.push(line);
  }
  return blockLines.join("\n");
}

test("every NEXT_PUBLIC_* var declared in env.client.ts is wired through the Dockerfile's app-builder ARG/ENV pair", () => {
  const declaredVars = readClientEnvVarNames();
  expect(declaredVars.length).toBeGreaterThan(0);

  const appBuilderStage = extractDockerfileAppBuilderStage();
  for (const name of declaredVars) {
    expect(
      appBuilderStage,
      `Dockerfile's app-builder stage is missing "ARG ${name}"`
    ).toMatch(new RegExp(`ARG ${name}=`));
    expect(
      appBuilderStage,
      `Dockerfile's app-builder stage is missing "ENV ${name}=$${name}"`
    ).toMatch(new RegExp(`ENV ${name}=\\$${name}\\b`));
  }
});

test("every NEXT_PUBLIC_* var declared in env.client.ts is passed as a build arg in docker-compose.app.yml's web service", () => {
  const declaredVars = readClientEnvVarNames();
  expect(declaredVars.length).toBeGreaterThan(0);

  const webBuildArgs = extractComposeWebBuildArgs();
  for (const name of declaredVars) {
    expect(
      webBuildArgs,
      `docker-compose.app.yml's web.build.args is missing "${name}"`
    ).toMatch(new RegExp(`^\\s*${name}:`, "m"));
  }
});
