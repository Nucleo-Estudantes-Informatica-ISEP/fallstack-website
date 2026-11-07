import assert from "node:assert/strict";
import { test } from "vitest";

import { createLogger, REDACTION_CENSOR } from "./logger";

function captureLogs(level = "debug") {
  const lines: string[] = [];
  const destination = {
    write(chunk: string) {
      lines.push(chunk);
    },
  };
  const logger = createLogger(
    { level, base: undefined, timestamp: false },
    destination
  );

  return { logger, lines };
}

test("redacts root and nested identifiers", () => {
  const { logger, lines } = captureLogs();

  logger.info(
    {
      token: "secret-token",
      context: {
        email: "student@example.com",
        profile: { studentCode: "STUDENT-123" },
      },
    },
    "Safe operation"
  );

  const output = JSON.parse(lines[0]);
  assert.equal(output.token, REDACTION_CENSOR);
  assert.equal(output.context.email, REDACTION_CENSOR);
  assert.equal(output.context.profile.studentCode, REDACTION_CENSOR);
  assert.doesNotMatch(
    lines[0],
    /secret-token|student@example\.com|STUDENT-123/
  );
});

test("omits error messages while retaining error type and stack", () => {
  const { logger, lines } = captureLogs();
  const error = new Error("student@example.com failed with STUDENT-123");

  logger.error({ err: error }, "Operation failed");

  const output = JSON.parse(lines[0]);
  assert.equal(output.err.type, "Error");
  assert.ok(output.err.stack);
  assert.doesNotMatch(lines[0], /student@example\.com|STUDENT-123/);
});

test("filters records below configured level", () => {
  const { logger, lines } = captureLogs("warn");

  logger.info("Not emitted");
  logger.warn("Emitted");

  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).msg, "Emitted");
});

test.each(["P2024", "P2028", "P2037", "STUDENT-123"])(
  "exposes only allowlisted DB capacity codes: %s",
  (code) => {
    const { logger, lines } = captureLogs();
    const error = Object.assign(
      new Error("student@example.com SQL parameters"),
      { code }
    );
    logger.error({ err: error }, "Operation failed");
    const output = JSON.parse(lines[0]);
    assert.equal(
      output.err.databaseErrorCode,
      code === "STUDENT-123" ? undefined : code
    );
    assert.doesNotMatch(
      lines[0],
      /student@example\.com|SQL parameters|STUDENT-123/
    );
  }
);
