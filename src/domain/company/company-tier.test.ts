import assert from "node:assert/strict";
import { test } from "vitest";

import { COMPANY_TIER, parseCompanyTier } from "./company-tier";
import { hrefByCompanyTier } from "./services/company-tier-access";

test("parseCompanyTier - valid parsing", () => {
  assert.equal(parseCompanyTier("diamond"), COMPANY_TIER.DIAMOND);
  assert.equal(parseCompanyTier("  GOLD  "), COMPANY_TIER.GOLD);
  assert.equal(parseCompanyTier("Silver"), COMPANY_TIER.SILVER);
  assert.equal(parseCompanyTier("BRONZE"), COMPANY_TIER.BRONZE);
});

test("parseCompanyTier - invalid parsing", () => {
  assert.throws(() => parseCompanyTier("invalid"), /Invalid company tier/);
});

test("hrefByCompanyTier - routing rules", () => {
  // Diamond and Gold use internal pages when they have edition content
  assert.equal(
    hrefByCompanyTier(COMPANY_TIER.DIAMOND, "Company A", undefined, true),
    "/company/Company%20A"
  );
  assert.equal(
    hrefByCompanyTier(
      COMPANY_TIER.GOLD,
      "Company B",
      "http://external.com",
      true
    ),
    "/company/Company%20B"
  );

  // ...but fall back to their website (or root) without edition content,
  // since the internal page 404s with nothing to show
  assert.equal(
    hrefByCompanyTier(
      COMPANY_TIER.DIAMOND,
      "Company A",
      "http://external.com",
      false
    ),
    "http://external.com"
  );
  assert.equal(
    hrefByCompanyTier(COMPANY_TIER.GOLD, "Company B", undefined, false),
    "/"
  );

  // Silver and Bronze redirect to external websites (or root if none provided)
  assert.equal(
    hrefByCompanyTier(
      COMPANY_TIER.SILVER,
      "Company C",
      "http://external.com",
      true
    ),
    "http://external.com"
  );
  assert.equal(
    hrefByCompanyTier(COMPANY_TIER.BRONZE, "Company D", undefined, false),
    "/"
  );
});
