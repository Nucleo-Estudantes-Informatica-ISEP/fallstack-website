import { expect, test } from "vitest";

import { directCvUploadSchema } from "@/schemas/directCvUploadSchema";

import { quarantineCvKey, validCvEnvelope } from "./cvUpload";

const bytes = (value: string) => new TextEncoder().encode(value);
test("PDF magic, version and terminator must all match", () => {
  expect(validCvEnvelope(bytes("%PDF-1.7\n"), bytes("\n%%EOF\n"))).toBe(true);
  for (const header of ["", "PNG", "%PDF-9.9\n"])
    expect(validCvEnvelope(bytes(header), bytes("%%EOF"))).toBe(false);
  expect(validCvEnvelope(bytes("%PDF-1.7\n"), bytes("truncated"))).toBe(false);
});
test("metadata rejects empty, oversized, forged type, extension and arbitrary keys", () => {
  const valid = {
    filename: "cv.pdf",
    contentType: "application/pdf",
    size: 10 * 1024 * 1024,
  };
  expect(directCvUploadSchema.safeParse(valid).success).toBe(true);
  for (const extra of [
    { size: 0 },
    { size: valid.size + 1 },
    { contentType: "image/png" },
    { filename: "cv.exe" },
    { key: "distribution/cv/victim.pdf" },
    { ownerId: "victim" },
  ])
    expect(directCvUploadSchema.safeParse({ ...valid, ...extra }).success).toBe(
      false
    );
  expect(quarantineCvKey("server-id")).toBe("quarantine/cv/server-id");
});
