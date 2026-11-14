// @vitest-environment node
import { performance } from "node:perf_hooks";
import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { z } from "zod";

import DocumentLayout from "@/components/DocumentLayout";
import GuestLayout from "@/components/GuestLayout";

import {
  sanitizeSentryEvent,
  sanitizeSentryLog,
} from "../../src/lib/sentryPrivacy";

import * as Sentry from "@sentry/nextjs";

vi.mock("client-only", () => ({}));

vi.mock("next/navigation", () => ({ usePathname: () => "/privacy-policy" }));

const env = z
  .object({
    RUN_PAGE_FRAME_BENCHMARK: z.string().optional(),
    PAGE_FRAME_BASE_URL: z.string().url().optional(),
  })
  .parse(process.env);

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

test.skipIf(env.RUN_PAGE_FRAME_BENCHMARK !== "1")(
  "measure shared SSR frame and error-tracking candidates",
  async () => {
    const child = <section>Measurement</section>;
    const frame = DocumentLayout({
      children: GuestLayout({ children: child }),
    });
    const render = () => renderToString(frame);
    expect(render()).toContain('id="main-content"');
    let processedLogs = 0;
    const client = Sentry.init({
      dsn: "http://public@127.0.0.1:9/1",
      tracesSampleRate: 0,
      enableLogs: true,
      sendDefaultPii: false,
      integrations: [Sentry.pinoIntegration()],
      beforeSend: sanitizeSentryEvent,
      beforeSendLog: (log) => {
        processedLogs++;
        return sanitizeSentryLog(log);
      },
      transport: () => ({
        send: async () => ({}),
        flush: async () => true,
      }),
    });
    if (!client) throw new Error("Benchmark Sentry client was not initialized");
    const results = [];
    for (const pass of ["rep1", "rep2"]) {
      results.push({
        pass,
        mode: "child-only",
        ...measure(() => renderToString(child)),
      });
      results.push({ pass, mode: "frame-only", ...measure(render) });
      for (const logs of pass === "rep1" ? [true, false] : [false, true]) {
        processedLogs = 0;
        client.getOptions().enableLogs = logs;
        results.push({
          pass,
          mode: `frame+scope+unsampled-span/logs=${logs}`,
          ...measure(() =>
            Sentry.withIsolationScope(() => {
              return Sentry.startSpan({ name: "frame", op: "render" }, () => {
                Sentry.logger.info("Synthetic frame benchmark");
                return render();
              });
            })
          ),
        });
        expect(processedLogs, `${pass} logs=${logs}`).toBe(logs ? 3200 : 0);
      }
    }
    await client.close();
    process.stdout.write(`shared-frame benchmark ${JSON.stringify(results)}\n`);
  },
  60000
);

test.skipIf(env.RUN_PAGE_FRAME_BENCHMARK !== "1" || !env.PAGE_FRAME_BASE_URL)(
  "measure warm production HTTP frame",
  async () => {
    const url = new URL("/login", env.PAGE_FRAME_BASE_URL);
    const results = [];
    const nonces = new Set<string>();
    for (const pass of ["rep1", "rep2"]) {
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
