const REDACTED = "[REDACTED]";

const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "cookies",
  "email",
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "access_token",
  "refresh_token",
  "session",
  "code",
  "studentcode",
  "student_code",
  "companyid",
  "company_id",
  "userid",
  "user_id",
  "studentid",
  "student_id",
  "employeeid",
  "employee_id",
  "id",
  "url",
  "query_string",
]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKeys.has(key.toLowerCase())
        ? REDACTED
        : sanitizeValue(nestedValue),
    ])
  );
}

export function sanitizeSentryEvent<T>(event: T): T {
  const sanitized = event as Record<string, any>;
  delete sanitized.user;

  if (sanitized.message) sanitized.message = "Application event";
  if (sanitized.logentry?.message) {
    sanitized.logentry.message = "Application event";
    delete sanitized.logentry.params;
  }

  if (sanitized.request) {
    delete sanitized.request.data;
    delete sanitized.request.cookies;
    delete sanitized.request.query_string;
    delete sanitized.request.url;
    sanitized.request.headers = sanitizeValue(sanitized.request.headers);
  }

  sanitized.contexts = sanitizeValue(sanitized.contexts);
  sanitized.extra = sanitizeValue(sanitized.extra);
  sanitized.tags = sanitizeValue(sanitized.tags);
  sanitized.breadcrumbs = sanitized.breadcrumbs?.map((breadcrumb: any) => ({
    ...breadcrumb,
    data: sanitizeValue(breadcrumb.data),
  }));

  for (const exception of sanitized.exception?.values || []) {
    exception.value = exception.type || "ApplicationError";
  }

  return event;
}

export function sanitizeSentryLog<T>(log: T): T {
  const sanitized = log as Record<string, any>;
  sanitized.attributes = sanitizeValue(sanitized.attributes);
  return log;
}
