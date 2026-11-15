import { expect, test, vi } from "vitest";

import { storageEnvSchema } from "./env.storage";

vi.mock("server-only", () => ({}));
const schema = storageEnvSchema.pick({
  S3_PUBLIC_ENDPOINT: true,
  CV_UPLOAD_TTL_SECONDS: true,
});
test("public signing endpoint accepts TLS origins and local HTTP; TTL is bounded", () => {
  for (const origin of [
    "https://files.example.test",
    "http://localhost:9000",
    "http://127.0.0.1:59000",
  ])
    expect(schema.safeParse({ S3_PUBLIC_ENDPOINT: origin }).success).toBe(true);
  expect(schema.parse({}).CV_UPLOAD_TTL_SECONDS).toBe(300);
  for (const origin of [
    "http://files.example.test",
    "https://files.test/proxy",
    "https://user:secret@files.test",
    "https://files.test?key=value",
  ])
    expect(schema.safeParse({ S3_PUBLIC_ENDPOINT: origin }).success).toBe(
      false
    );
  for (const ttl of [0, 29, 601])
    expect(schema.safeParse({ CV_UPLOAD_TTL_SECONDS: ttl }).success).toBe(
      false
    );
});
