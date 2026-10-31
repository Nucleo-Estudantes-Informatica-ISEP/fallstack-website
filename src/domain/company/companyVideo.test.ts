import { expect, test } from "vitest";

import { companyVideoId, isMp4Header } from "./companyVideo";

test("accepts only canonical app-owned video paths", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  expect(companyVideoId(`/api/media/video/${id}`)).toBe(id);
  for (const url of [
    "https://evil.test/file.mp4",
    `/api/media/video/${id}?x=1`,
    `/api/media/video/%2e%2e/${id}`,
    `/api/media/logo/${id}`,
  ])
    expect(companyVideoId(url)).toBeNull();
});

test("checks the bounded MP4 file-type box and compatible brands", () => {
  const header = Buffer.from(
    "00000018667479706d7034320000000069736f6d6d703432",
    "hex"
  );
  expect(isMp4Header(header)).toBe(true);
  expect(isMp4Header(header.subarray(0, 12))).toBe(false);
  const invalid = Buffer.from(header);
  invalid.write("html", 4);
  expect(isMp4Header(invalid)).toBe(false);
  invalid.write("ftyp", 4);
  invalid.writeUInt32BE(2000, 0);
  expect(isMp4Header(invalid)).toBe(false);
});
