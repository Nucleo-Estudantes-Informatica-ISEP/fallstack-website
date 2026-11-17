import { expect, test } from "vitest";

import { CV_PART_BYTES, cvPartSize } from "./cvMultipart";

test("parts retain exact total size at realistic and 10 MiB boundaries", () => {
  expect(cvPartSize(184320, 1)).toBe(184320);
  expect(cvPartSize(CV_PART_BYTES + 1, 1)).toBe(CV_PART_BYTES);
  expect(cvPartSize(CV_PART_BYTES + 1, 2)).toBe(1);
  expect(cvPartSize(2 * CV_PART_BYTES, 2)).toBe(CV_PART_BYTES);
  for (const part of [0, 1.5, 3])
    expect(() => cvPartSize(2 * CV_PART_BYTES, part)).toThrow();
  expect(() => cvPartSize(184320, 2)).toThrow();
});
