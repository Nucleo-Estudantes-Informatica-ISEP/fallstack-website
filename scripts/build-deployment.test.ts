// @vitest-environment node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, test } from "vitest";

test("both static modes build without backend credentials or dynamic entrypoints", () => {
  for (const { mode, date } of [
    { mode: "OFF-SEASON", date: "" },
    { mode: "PREPARATION", date: "" },
    {
      mode: "PREPARATION",
      date: new Date(Date.now() + 86400000).toISOString(),
    },
  ]) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/build-deployment.tsx"],
      {
        env: {
          PATH: process.env.PATH,
          NODE_ENV: "test",
          DEPLOYMENT_MODE: mode,
          EDITION_STARTS_AT: date,
          DATABASE_URL: "denied",
          S3_ENDPOINT: "http://127.0.0.1:1",
          AUTH_ISSUER_URL: "http://127.0.0.1:1",
        },
        encoding: "utf8",
      }
    );
    expect(result.status, result.stderr).toBe(0);
    const html = readFileSync("static-output/index.html", "utf8");
    expect(html).toContain(`data-start="${date ? Date.parse(date) : ""}"`);
    expect(html).toContain('src="/assets/logo.png"');
    expect(html).not.toMatch(
      /\/api\/|\/_next\/|login|signup|dashboard|session/i
    );
  }
});

test("countdown becomes generic after expiry without infrastructure calls", () => {
  const element = {
    dataset: { start: String(Date.now() - 1) },
    textContent: "",
  };
  vm.runInNewContext(readFileSync("deployment/static/landing.js", "utf8"), {
    document: { getElementById: () => element },
    navigator: {},
    setInterval: () => {},
  });
  expect(element.textContent).toBe(
    "Novidades sobre a próxima edição em breve."
  );
});

test("replacement worker deletes stale caches and redirects controlled windows", async () => {
  const listeners: Record<
    string,
    (event: { waitUntil: (value: Promise<void>) => void }) => void
  > = {};
  const removed: string[] = [];
  const navigations: string[] = [];
  let claimed = false;
  vm.runInNewContext(readFileSync("deployment/static/sw.js", "utf8"), {
    self: {
      addEventListener: (
        name: string,
        listener: (typeof listeners)[string]
      ) => {
        listeners[name] = listener;
      },
      clients: {
        claim: async () => {
          claimed = true;
        },
        matchAll: async () => [
          {
            navigate: async (path: string) => {
              navigations.push(path);
            },
          },
        ],
      },
    },
    caches: {
      keys: async () => ["old-auth", "old-offline"],
      delete: async (key: string) => {
        removed.push(key);
      },
    },
  });
  await new Promise<void>((resolve, reject) =>
    listeners.activate({
      waitUntil: (value) => {
        value.then(resolve, reject);
      },
    })
  );
  expect(removed).toEqual(["old-auth", "old-offline"]);
  expect(claimed).toBe(true);
  expect(navigations).toEqual(["/"]);
});
