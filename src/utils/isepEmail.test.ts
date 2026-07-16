import assert from "node:assert/strict";
import { test } from "vitest";

import { ISEP_EMAIL_DOMAIN, isIsepEmail } from "./isepEmail";

test("validates supported ISEP student email formats", () => {
  assert.equal(ISEP_EMAIL_DOMAIN, "isep.ipp.pt");
  assert.equal(isIsepEmail("1234567@isep.ipp.pt"), true);
  assert.equal(isIsepEmail("ABC@ISEP.IPP.PT"), true);
  assert.equal(isIsepEmail("12345678@isep.ipp.pt"), false);
  assert.equal(isIsepEmail("student@example.com"), false);
});
