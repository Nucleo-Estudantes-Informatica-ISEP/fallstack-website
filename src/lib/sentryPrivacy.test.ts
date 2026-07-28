import assert from "node:assert/strict";
import { test } from "vitest";

import { sanitizeSentryEvent, sanitizeSentryLog } from "./sentryPrivacy";

test("removes PII from Sentry events and retains stack frames", () => {
  const event = {
    message: "student@example.com caused failure",
    logentry: {
      message: "Student STUDENT-123 caused failure",
      params: ["STUDENT-123"],
    },
    user: { id: "user-1", email: "student@example.com" },
    request: {
      url: "https://example.com/student/STUDENT-123?token=secret",
      data: { password: "secret" },
      cookies: { session: "secret" },
      query_string: "token=secret",
      headers: { authorization: "Bearer secret", accept: "application/json" },
    },
    contexts: { student: { id: "student-1", code: "STUDENT-123" } },
    extra: { companyId: "company-1" },
    breadcrumbs: [
      {
        category: "navigation",
        data: { url: "https://example.com/student/STUDENT-123" },
      },
    ],
    exception: {
      values: [
        {
          type: "TypeError",
          value: "student@example.com caused failure",
          stacktrace: { frames: [{ filename: "src/app/api/saved/route.ts" }] },
        },
      ],
    },
  };

  const sanitized = sanitizeSentryEvent(event);

  assert.equal(sanitized.user, undefined);
  assert.equal(sanitized.message, "Application event");
  assert.equal(sanitized.logentry.message, "Application event");
  assert.equal(sanitized.logentry.params, undefined);
  assert.equal(sanitized.request.url, undefined);
  assert.equal(sanitized.request.data, undefined);
  assert.equal(sanitized.request.cookies, undefined);
  assert.equal(sanitized.request.query_string, undefined);
  assert.equal(sanitized.request.headers.authorization, "[REDACTED]");
  assert.equal(sanitized.request.headers.accept, "application/json");
  assert.equal(sanitized.contexts.student.id, "[REDACTED]");
  assert.equal(sanitized.contexts.student.code, "[REDACTED]");
  assert.equal(sanitized.extra.companyId, "[REDACTED]");
  assert.equal(sanitized.breadcrumbs[0].data.url, "[REDACTED]");
  assert.equal(sanitized.exception.values[0].value, "TypeError");
  assert.deepEqual(sanitized.exception.values[0].stacktrace.frames, [
    { filename: "src/app/api/saved/route.ts" },
  ]);
});

test("redacts breadcrumb message while preserving other fields", () => {
  const event = {
    breadcrumbs: [
      {
        category: "console",
        level: "error",
        message: "some error containing test@example.com",
      },
    ],
  };

  const sanitized = sanitizeSentryEvent(event);

  assert.equal(sanitized.breadcrumbs[0].message, "Application event");
  assert.equal(sanitized.breadcrumbs[0].category, "console");
  assert.equal(sanitized.breadcrumbs[0].level, "error");
});

test("redacts nested Sentry log attributes", () => {
  const log = {
    message: "Operation failed",
    attributes: {
      operation: "save_student",
      context: { token: "secret", studentId: "student-1" },
    },
  };

  const sanitized = sanitizeSentryLog(log);

  assert.equal(sanitized.attributes.operation, "save_student");
  assert.equal(sanitized.attributes.context.token, "[REDACTED]");
  assert.equal(sanitized.attributes.context.studentId, "[REDACTED]");
});
