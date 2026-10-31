import "server-only";

import { z } from "zod";

// Independent of app secrets: metrics can start before the first app request.
export const metricsEnv = z
  .object({
    METRICS_ENABLED: z.enum(["true", "false"]).default("false"),
    METRICS_HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
    METRICS_ENVIRONMENT: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(["dev", "main"]).optional()
    ),
  })
  .refine((env) => env.METRICS_ENABLED !== "true" || env.METRICS_ENVIRONMENT, {
    message: "METRICS_ENVIRONMENT must be dev or main when metrics are enabled",
  })
  .parse(process.env);
