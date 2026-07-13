import assert from "node:assert/strict";
import test from "node:test";
import { parseCompanyTier, COMPANY_TIER } from "./company-tier";
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
  // Diamond and Gold use internal pages
  assert.equal(hrefByCompanyTier(COMPANY_TIER.DIAMOND, "Company A", undefined), "/company/Company%20A");
  assert.equal(hrefByCompanyTier(COMPANY_TIER.GOLD, "Company B", "http://external.com"), "/company/Company%20B");

  // Silver and Bronze redirect to external websites (or root if none provided)
  assert.equal(hrefByCompanyTier(COMPANY_TIER.SILVER, "Company C", "http://external.com"), "http://external.com");
  assert.equal(hrefByCompanyTier(COMPANY_TIER.BRONZE, "Company D", undefined), "/");
});
