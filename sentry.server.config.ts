import { clientEnv } from "@/config/env.client";
import { sanitizeSentryEvent, sanitizeSentryLog } from "@/lib/sentryPrivacy";

import * as Sentry from "@sentry/nextjs";

const dsn = clientEnv.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  enableLogs: true,
  integrations: [Sentry.pinoIntegration()],
  beforeSend: sanitizeSentryEvent,
  beforeSendLog: sanitizeSentryLog,
});
