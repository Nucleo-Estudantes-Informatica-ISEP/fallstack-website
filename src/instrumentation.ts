import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    const { metricsEnv } = await import("./config/env.metrics");
    if (metricsEnv.METRICS_ENABLED === "true") {
      const state = globalThis as typeof globalThis & {
        fallstackMetrics?: Promise<unknown>;
      };
      state.fallstackMetrics ??= import("./lib/metrics")
        .then(({ startMetricsServer }) =>
          startMetricsServer({
            host: metricsEnv.METRICS_HOST,
            port: 9464,
            environment: metricsEnv.METRICS_ENVIRONMENT!,
          })
        )
        .catch(() => {
          // Monitoring failure must not take the event application down.
          console.error(
            "Metrics listener failed to start; check private port 9464."
          );
        });
      await state.fallstackMetrics;
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
