import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import { COMPANY_TIER } from "@/domain/Company/company-tier";

import CompaniesContainer from "./index";

test("CompaniesContainer passes tier down to Company cards", () => {
  const html = renderToString(
    <CompaniesContainer
      tier={COMPANY_TIER.DIAMOND}
      companies={[{ name: "TestCorp", logoHref: "/dummy.png" }]}
    />
  );

  // For Diamond tier, Company component will generate a Link to /company/TestCorp
  // because hrefByCompanyTier(DIAMOND) returns internal page route when no websiteUrl.
  // If tier was missing, it defaults to BRONZE -> defaults to "/"
  assert.match(html, /href="\/company\/TestCorp"/);
});
