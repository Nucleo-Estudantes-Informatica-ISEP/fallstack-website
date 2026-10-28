import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    try {
      const { metricsEnv } = await import("./config/env.metrics");
      if (metricsEnv.METRICS_ENABLED === "true") {
        const state = globalThis as typeof globalThis & {
          fallstackMetrics?: Promise<unknown>;
        };
        state.fallstackMetrics ??= import("./lib/metrics").then(
          ({ startMetricsServer }) =>
            startMetricsServer({
              host: metricsEnv.METRICS_HOST,
              port: 9464,
              environment: metricsEnv.METRICS_ENVIRONMENT!,
            })
        );
        await state.fallstackMetrics;
      }
    } catch {
      // Neither invalid config nor listener failure may take the app down.
      console.error(
        "Metrics disabled: invalid configuration or private port 9464 unavailable."
      );
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
