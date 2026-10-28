import { createServer, type Server } from "node:http";

import {
  createStagingRequestContext,
  guardBrowserContext,
} from "../stagingSafety";
import { expect, test } from "./fixtures";

let staging: Server;
let destination: Server;
let stagingOrigin: string;
let destinationOrigin: string;
let destinationRequests = 0;

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  return `http://127.0.0.1:${address.port}`;
}

test.beforeAll(async () => {
  destination = createServer((_req, res) => {
    destinationRequests++;
    res.end("unexpected destination traffic");
  });
  destinationOrigin = await listen(destination);
  staging = createServer((req, res) => {
    if (req.url === "/api/health") {
      res.setHeader("Content-Type", "application/json");
      res.end('{"status":200}');
    } else if (req.url === "/") {
      res.end("<!doctype html><title>Staging</title>");
    } else {
      res.writeHead(req.method === "DELETE" ? 308 : 307, {
        Location:
          req.url === "/same-origin-redirect"
            ? "/bridge"
            : `${destinationOrigin}/production`,
      });
      res.end();
    }
  });
  stagingOrigin = await listen(staging);
});

test.afterAll(async () => {
  await Promise.all(
    [staging, destination]
      .filter(Boolean)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve()))
          )
      )
  );
});

test("route-specific redirects never forward authenticated POST/DELETE or student requests", async () => {
  const context = await createStagingRequestContext({
    baseURL: stagingOrigin,
    extraHTTPHeaders: { Cookie: "session=synthetic-staging-session" },
  });
  try {
    expect((await context.get("/api/health")).status()).toBe(200);
    expect(
      (
        await context.post("/api/saved", {
          data: { token: "synthetic-qr" },
          maxRedirects: 20,
        })
      ).status()
    ).toBe(307);
    expect((await context.delete("/api/admin/faqs/synthetic")).status()).toBe(
      308
    );
    expect((await context.get("/api/qrcode")).status()).toBe(307);
    expect(() => context.post(`${destinationOrigin}/api/saved`)).toThrow(
      /origin/
    );
    expect(destinationRequests).toBe(0);
  } finally {
    await context.dispose();
  }
});

test("browser blocks direct navigation, redirect chains, and fetch mutations before leaving staging", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.addCookies([
    {
      name: "session",
      value: "synthetic-staging-session",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await guardBrowserContext(context, stagingOrigin);
  try {
    for (const url of [
      `${destinationOrigin}/production`,
      `${stagingOrigin}/redirect`,
      `${stagingOrigin}/same-origin-redirect`,
    ]) {
      const page = await context.newPage();
      await expect(page.goto(url)).rejects.toThrow();
      await page.close();
    }
    const page = await context.newPage();
    await page.goto(stagingOrigin);
    const succeeded = await page.evaluate(async () => {
      try {
        await fetch("/api/saved", { method: "POST", body: "synthetic-qr" });
        return true;
      } catch {
        return false;
      }
    });
    expect(succeeded).toBe(false);
    expect(destinationRequests).toBe(0);
  } finally {
    await context.close();
  }
});
