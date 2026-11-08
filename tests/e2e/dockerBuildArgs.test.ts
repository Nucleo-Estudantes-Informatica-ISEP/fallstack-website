import { readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
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
  // Scoped to the schema object's key declarations, not the whole file -
  // several of these vars are also referenced by name in prose comments
  // elsewhere in the file (e.g. "same as NEXT_PUBLIC_SENTRY_DSN above"),
  // which would otherwise inflate this list with names that aren't
  // actually schema keys.
  const schemaStart = source.indexOf("const clientEnvSchema = z.object({");
  if (schemaStart === -1) {
    throw new Error(
      "Couldn't find `const clientEnvSchema = z.object({` - has it been renamed?"
    );
  }
  const schemaEnd = source.indexOf("});", schemaStart);
  const schemaBody = source.slice(schemaStart, schemaEnd);
  const matches = schemaBody.matchAll(/^\s*(NEXT_PUBLIC_[A-Z0-9_]+):/gm);
  return [...new Set([...matches].map((match) => match[1]))];
}

function readServerEnvVarNames(): string[] {
  const source = readFileSync(
    path.join(ROOT, "src/config/env.server.ts"),
    "utf-8"
  );
  const schemaStart = source.indexOf("const serverEnvSchema = z.object({");
  if (schemaStart === -1)
    throw new Error("Couldn't find the server environment schema");
  const schemaEnd = source.indexOf("});", schemaStart);
  const schemaBody = source.slice(schemaStart, schemaEnd);
  const storageSchema = readFileSync(
    path.join(ROOT, "src/config/env.storage.ts"),
    "utf-8"
  );
  return [
    ...(schemaBody + storageSchema).matchAll(/^\s*([A-Z][A-Z0-9_]+):/gm),
  ].map((match) => match[1]);
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

function readCompose(): string {
  return readFileSync(path.join(ROOT, "docker-compose.app.yml"), "utf-8");
}

function readLocalCompose(): string {
  return readFileSync(path.join(ROOT, "docker-compose.local.yml"), "utf-8");
}

function sliceIndentedBlock(lines: string[], fromIndex: number): string[] {
  const blockIndent = lines[fromIndex].search(/\S/);
  const blockLines: string[] = [];
  for (const line of lines.slice(fromIndex + 1)) {
    if (line.trim() === "") continue;
    const indent = line.search(/\S/);
    if (indent <= blockIndent) break;
    blockLines.push(line);
  }
  return blockLines;
}

function extractComposeServiceBlock(service: string): string[] {
  const lines = readCompose().split("\n");
  const serviceLineIndex = lines.findIndex(
    (line) => line.trim() === `${service}:`
  );
  if (serviceLineIndex === -1) {
    throw new Error(
      `Couldn't find a top-level \`${service}:\` service in docker-compose.app.yml`
    );
  }
  return sliceIndentedBlock(lines, serviceLineIndex);
}

function extractComposeWebBuildArgs(): string {
  const webBlockLines = extractComposeServiceBlock("web");

  const argsLineIndex = webBlockLines.findIndex(
    (line) => line.trim() === "args:"
  );
  if (argsLineIndex === -1) {
    throw new Error(
      "Couldn't find `web.build.args:` in docker-compose.app.yml - has the web service's build config been restructured?"
    );
  }
  return sliceIndentedBlock(webBlockLines, argsLineIndex).join("\n");
}

function extractComposeServiceEnvironment(service: string): string {
  const serviceBlockLines = extractComposeServiceBlock(service);
  const environmentLineIndex = serviceBlockLines.findIndex(
    (line) => line.trim() === "environment:"
  );
  if (environmentLineIndex === -1) {
    throw new Error(
      `Couldn't find \`${service}.environment:\` in docker-compose.app.yml`
    );
  }
  return sliceIndentedBlock(serviceBlockLines, environmentLineIndex).join("\n");
}

function expectRequiredComposeVariable(block: string, name: string) {
  const requiredExpansion = "${" + name + ":?";
  expect(
    block,
    `docker-compose.app.yml must mark ${name} as required with Compose's :? expansion`
  ).toContain(`${name}: ${requiredExpansion}`);
}

function expectComposeVariable(block: string, name: string, expansion: string) {
  expect(
    block,
    `docker-compose.app.yml must wire ${name} to ${expansion}`
  ).toContain(`${name}: ${expansion}`);
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

test("runtime variable discovery includes the shared storage schema", () => {
  expect(readServerEnvVarNames()).toEqual(
    expect.arrayContaining([
      "S3_ENDPOINT",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
      "S3_BUCKET_AVATARS",
      "S3_BUCKET_LOGOS",
      "S3_BUCKET_CVS",
    ])
  );
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

test("every server environment variable is available to the runtime web service", () => {
  const declaredVars = readServerEnvVarNames().filter(
    (name) => name !== "NODE_ENV" // Set by the Dockerfile's runtime stage.
  );
  expect(declaredVars.length).toBeGreaterThan(0);

  const webEnvironment = extractComposeServiceEnvironment("web");
  for (const name of declaredVars) {
    expect(
      webEnvironment,
      `docker-compose.app.yml's web.environment is missing ${name}`
    ).toMatch(new RegExp(`^\\s*${name}:`, "m"));
  }

  const webBuildArgs = extractComposeWebBuildArgs();
  for (const name of declaredVars.filter((name) =>
    name.startsWith("GOOGLE_WALLET_")
  )) {
    const defaultValue = name === "GOOGLE_WALLET_NEVER_ENABLED" ? "false" : "";
    expectComposeVariable(
      webEnvironment,
      name,
      "${" + name + ":-" + defaultValue + "}"
    );
    expect(webBuildArgs).not.toMatch(new RegExp(`^\\s*${name}:`, "m"));
  }
});

test("Coolify compose keeps secrets required and derives safe service defaults", () => {
  const baseUrlExpansion =
    "${NEXT_PUBLIC_BASE_URL:-${SERVICE_URL_WEB:-http://localhost:4000}/api}";
  const directUrlExpansion =
    "${DIRECT_URL:-${DATABASE_URL:?Configure DATABASE_URL in Coolify}}";

  const webBuildArgs = extractComposeWebBuildArgs();
  expectComposeVariable(webBuildArgs, "NEXT_PUBLIC_BASE_URL", baseUrlExpansion);

  const migrateEnvironment = extractComposeServiceEnvironment("migrate");
  expectRequiredComposeVariable(migrateEnvironment, "DATABASE_URL");
  expectComposeVariable(migrateEnvironment, "DIRECT_URL", directUrlExpansion);

  const webEnvironment = extractComposeServiceEnvironment("web");
  for (const name of [
    "DATABASE_URL",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET_AVATARS",
    "S3_BUCKET_LOGOS",
    "S3_BUCKET_CVS",
  ]) {
    expectRequiredComposeVariable(webEnvironment, name);
  }
  // Coolify adds its runtime .env to every Compose service; give web only
  // the scoped runtime URL even when DIRECT_URL holds migrator credentials.
  expectComposeVariable(
    webEnvironment,
    "DIRECT_URL",
    "${DATABASE_URL:?Configure DATABASE_URL in Coolify}"
  );
  expectComposeVariable(
    webEnvironment,
    "NEXT_PUBLIC_BASE_URL",
    baseUrlExpansion
  );
  expectComposeVariable(
    webEnvironment,
    "JWT_SECRET",
    "${JWT_SECRET:-${SERVICE_REALBASE64_64_JWT}}"
  );
  expectComposeVariable(
    webEnvironment,
    "AUTH_SECRET",
    "${AUTH_SECRET:-${SERVICE_REALBASE64_64_AUTH}}"
  );
});

test("Coolify compose keeps the migrator one-shot and avoids global container names", () => {
  const migrateBlock = extractComposeServiceBlock("migrate").join("\n");
  const webBlock = extractComposeServiceBlock("web").join("\n");

  expect(migrateBlock).toContain('restart: "no"');
  expect(migrateBlock).toContain("exclude_from_hc: true");
  expect(migrateBlock).not.toMatch(/^\s*container_name:/m);
  expect(webBlock).not.toMatch(/^\s*container_name:/m);
});


test("local Compose starts an isolated full development stack", () => {
  const source = readLocalCompose();
  const compose = parseYaml(source) as {
    services: Record<
      string,
      {
        image?: string;
        environment?: Record<string, string>;
        depends_on?: Record<string, { condition?: string }>;
        deploy?: { replicas?: number };
      }
    >;
    networks?: Record<string, unknown>;
    volumes?: Record<string, unknown>;
  };

  expect(source).not.toContain("exclude_from_hc");
  expect(source).not.toContain("external: true");
  expect(source).not.toContain("shared_data");
  expect(source).not.toContain("redis_shared");
  expect(compose.networks).toBeUndefined();
  expect(compose.services).toEqual(
    expect.objectContaining({
      postgres: expect.any(Object),
      redis: expect.any(Object),
      minio: expect.any(Object),
      "minio-init-avatars": expect.any(Object),
      "minio-init-logos": expect.any(Object),
      "minio-init-cvs": expect.any(Object),
      migrate: expect.any(Object),
      "storage-cleanup": expect.any(Object),
      web: expect.any(Object),
    })
  );

  expect(compose.services.migrate.depends_on?.postgres?.condition).toBe(
    "service_healthy"
  );
  for (const service of [
    "minio-init-avatars",
    "minio-init-logos",
    "minio-init-cvs",
  ]) {
    expect(compose.services[service].depends_on?.minio?.condition).toBe(
      "service_healthy"
    );
    expect(compose.services[service].environment?.MC_HOST_local).toContain(
      "@minio:9000"
    );
  }
  expect(
    compose.services.web.depends_on?.migrate?.condition
  ).toBe("service_completed_successfully");
  expect(
    compose.services.web.depends_on?.redis?.condition
  ).toBe("service_healthy");
  for (const service of [
    "minio-init-avatars",
    "minio-init-logos",
    "minio-init-cvs",
  ]) {
    expect(compose.services.web.depends_on?.[service]?.condition).toBe(
      "service_completed_successfully"
    );
    expect(
      compose.services["storage-cleanup"].depends_on?.[service]?.condition
    ).toBe("service_completed_successfully");
  }

  const webEnvironment = compose.services.web.environment ?? {};
  expect(webEnvironment.DATABASE_URL).toContain("@postgres:5432/");
  expect(webEnvironment.REDIS_URL).toContain("@redis:6379");
  expect(webEnvironment.REDIS_KEY_PREFIX).toBe("fallstack:dev:");
  expect(webEnvironment.S3_ENDPOINT).toBe("http://minio:9000");
  expect(webEnvironment.GOOGLE_WALLET_NEVER_ENABLED).toBe(
    "${FALLSTACK_LOCAL_GOOGLE_WALLET_NEVER_ENABLED:-true}"
  );
  expect(compose.services["minio-init-avatars"].image).toContain("coollabsio/minio:");
  expect(source).toContain("/minio/health/ready");
  expect(compose.volumes).toEqual(
    expect.objectContaining({
      postgres_data: expect.any(Object),
      redis_data: expect.any(Object),
      minio_data: expect.any(Object),
    })
  );
});
