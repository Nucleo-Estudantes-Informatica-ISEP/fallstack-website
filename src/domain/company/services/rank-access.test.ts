import assert from "node:assert/strict";
import { test } from "vitest";

import { companyProfileHref } from "./rank-access";

test("companyProfileHref - routing rules", () => {
  // A rank with an internal page uses it when there's content to show
  assert.equal(
    companyProfileHref(true, "Company A", undefined, true),
    "/company/Company%20A"
  );
  assert.equal(
    companyProfileHref(true, "Company B", "http://external.com", true),
    "/company/Company%20B"
  );

  // ...but falls back to its website (or root) without content, since the
  // internal page 404s with nothing to show
  assert.equal(
    companyProfileHref(true, "Company A", "http://external.com", false),
    "http://external.com"
  );
  assert.equal(companyProfileHref(true, "Company B", undefined, false), "/");

  // Ranks without an internal page always redirect to their website (or
  // root if none provided), regardless of content
  assert.equal(
    companyProfileHref(false, "Company C", "http://external.com", true),
    "http://external.com"
  );
  assert.equal(companyProfileHref(false, "Company D", undefined, false), "/");
});
