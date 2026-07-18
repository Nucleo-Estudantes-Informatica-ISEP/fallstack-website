import pino, { type DestinationStream, type LoggerOptions } from "pino";

import * as Sentry from "@sentry/nextjs";

export const REDACTION_CENSOR = "[REDACTED]";

const sensitiveKeys = [
  "authorization",
  "cookie",
  "email",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "access_token",
  "refresh_token",
  "session",
  "code",
  "studentCode",
  "student_code",
  "id",
  "companyId",
  "company_id",
  "userId",
  "user_id",
  "studentId",
  "student_id",
  "employeeId",
  "employee_id",
];

export const REDACTION_PATHS = [
  ...sensitiveKeys,
  ...sensitiveKeys.map((key) => `*.${key}`),
  ...sensitiveKeys.map((key) => `*.*.${key}`),
  "headers.authorization",
  "headers.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
];

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return { type: "UnknownError" };

  return {
    type: error.name || "Error",
    stack: error.stack?.split("\n").slice(1).join("\n"),
  };
}

export function createLogger(
  options: LoggerOptions = {},
  destination?: DestinationStream
) {
  const loggerOptions: LoggerOptions = {
    ...options,
    level:
      options.level ||
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    redact: {
      paths: REDACTION_PATHS,
      censor: REDACTION_CENSOR,
    },
    serializers: {
      err: serializeError,
      error: serializeError,
    },
  };

  return destination ? pino(loggerOptions, destination) : pino(loggerOptions);
}

const logger = createLogger();

export function reportError(
  error: unknown,
  context: Record<string, unknown>,
  message: string
) {
  logger.error({ ...context, err: error }, message);
  Sentry.captureException(error, { extra: context });
}

export default logger;
