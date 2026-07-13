import assert from "node:assert/strict";
import test from "node:test";

import {
  ISEP_EMAIL_DOMAIN,
  isIsepEmail,
  normalizeIsepEmail,
} from "./isepEmail";

test("validates supported ISEP student email formats", () => {
  assert.equal(ISEP_EMAIL_DOMAIN, "isep.ipp.pt");
  assert.equal(isIsepEmail("1234567@isep.ipp.pt"), true);
  assert.equal(isIsepEmail("ABC@ISEP.IPP.PT"), true);
  assert.equal(isIsepEmail("12345678@isep.ipp.pt"), false);
  assert.equal(isIsepEmail("student@example.com"), false);
});

test("normalizes an ISEP local part or full email", () => {
  assert.equal(normalizeIsepEmail(" 1234567 "), "1234567@isep.ipp.pt");
  assert.equal(normalizeIsepEmail(" ABC@ISEP.IPP.PT "), "abc@isep.ipp.pt");
});
