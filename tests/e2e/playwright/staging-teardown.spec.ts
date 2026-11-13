import { createServer } from "node:http";

import { expect, test as guardedTest } from "./fixtures";

interface SlowAssetServer {
  origin: string;
  started: Promise<void>;
}

const test = guardedTest.extend<{ slowAssetServer: SlowAssetServer }>({
  slowAssetServer: async ({}, run) => {
    let notifyStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    let completed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const server = createServer((req, res) => {
      if (req.url === "/slow.svg") {
        notifyStarted();
        res.once("finish", () => {
          completed = true;
        });
        timer = setTimeout(() => {
          res.setHeader("Content-Type", "image/svg+xml");
          res.end('<svg xmlns="http://www.w3.org/2000/svg"/>');
        }, 500);
      } else {
        res.setHeader("Content-Type", "text/html");
        res.end('<!doctype html><title>Staging</title><img src="/slow.svg">');
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing port");
    try {
      await run({ origin: `http://127.0.0.1:${address.port}`, started });
      expect(
        completed,
        "fixture teardown must finish the guarded asset request"
      ).toBe(true);
    } finally {
      clearTimeout(timer);
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  },
  baseURL: async ({ slowAssetServer }, run) => {
    await run(slowAssetServer.origin);
  },
});

test("guarded context drains a pending asset before closing", async ({
  page,
  slowAssetServer,
}) => {
  await page.goto(slowAssetServer.origin, { waitUntil: "domcontentloaded" });
  await slowAssetServer.started;
  // End while route.fetch is pending, as a header-only page assertion can do.
});
