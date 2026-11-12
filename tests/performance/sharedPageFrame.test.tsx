// @vitest-environment node
import { performance } from "node:perf_hooks";
import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import GuestLayout from "../../src/app/(guest)/layout";
import RootLayout from "../../src/app/layout";
import {
  sanitizeSentryEvent,
  sanitizeSentryLog,
} from "../../src/lib/sentryPrivacy";

import * as Sentry from "@sentry/nextjs";

vi.mock("client-only", () => ({}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/privacy-policy" }));

function measure(operation: () => string) {
  for (let i = 0; i < 200; i++) operation();
  const samples: number[] = [];
  for (let batch = 0; batch < 30; batch++) {
    const start = performance.now();
    for (let i = 0; i < 100; i++) operation();
    samples.push((performance.now() - start) / 100);
  }
  samples.sort((a, b) => a - b);
  return { p50ms: +samples[15].toFixed(4), p95ms: +samples[28].toFixed(4) };
}

test.skipIf(process.env.RUN_PAGE_FRAME_BENCHMARK !== "1")(
  "measure shared SSR frame and error-tracking candidates",
  async () => {
    const child = <section>Measurement</section>;
    const frame = await RootLayout({
      children: GuestLayout({ children: child }),
    });
    const render = () => renderToString(frame);
    expect(render()).toContain('id="main-content"');
    const results = [];
    for (const pass of ["before", "after"]) {
      results.push({
        pass,
        mode: "child-only",
        ...measure(() => renderToString(child)),
      });
      results.push({ pass, mode: "frame-only", ...measure(render) });
      for (const logs of [true, false]) {
        Sentry.init({
          dsn: "http://public@127.0.0.1:9/1",
          tracesSampleRate: 0,
          enableLogs: logs,
          sendDefaultPii: false,
          integrations: [Sentry.pinoIntegration()],
          beforeSend: sanitizeSentryEvent,
          beforeSendLog: sanitizeSentryLog,
          transport: () => ({
            send: async () => ({}),
            flush: async () => true,
          }),
        });
        results.push({
          pass,
          mode: `frame+scope+unsampled-span/logs=${logs}`,
          ...measure(() =>
            Sentry.withIsolationScope(() =>
              Sentry.startSpan({ name: "frame", op: "render" }, render)
            )
          ),
        });
        await Sentry.close();
      }
    }
    process.stdout.write(`shared-frame benchmark ${JSON.stringify(results)}\n`);
  },
  60000
);

test.skipIf(
  process.env.RUN_PAGE_FRAME_BENCHMARK !== "1" ||
    !process.env.PAGE_FRAME_BASE_URL
)(
  "measure warm production HTTP frame",
  async () => {
    const url = new URL("/privacy-policy", process.env.PAGE_FRAME_BASE_URL);
    const results = [];
    const nonces = new Set<string>();
    for (const pass of ["before", "after"]) {
      const samples: number[] = [];
      for (let i = 0; i < 120; i++) {
        const start = performance.now();
        const response = await fetch(url);
        const html = await response.text();
        const duration = performance.now() - start;
        expect(response.status).toBe(200);
        expect(html).toContain('id="main-content"');
        const nonce = response.headers
          .get("content-security-policy")
          ?.match(/'nonce-([^']+)'/);
        expect(nonce).not.toBeNull();
        expect(nonce).toBeDefined();
        nonces.add(nonce![1]);
        if (i >= 20) samples.push(duration);
      }
      samples.sort((a, b) => a - b);
      results.push({
        pass,
        requests: samples.length,
        p50ms: +samples[50].toFixed(3),
        p95ms: +samples[95].toFixed(3),
      });
    }
    expect(nonces.size).toBe(240);
    process.stdout.write(
      `production-frame HTTP control ${JSON.stringify(results)}\n`
    );
  },
  60000
);
