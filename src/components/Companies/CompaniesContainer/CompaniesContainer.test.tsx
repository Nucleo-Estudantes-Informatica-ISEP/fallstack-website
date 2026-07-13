import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import CompaniesContainer from "./index";
import { COMPANY_TIER } from "@/domain/Company/company-tier";
import { StaticImageData } from "next/image";

test("CompaniesContainer passes tier down to Company cards", () => {
  const dummyLogo: StaticImageData = { src: "/dummy.png", height: 100, width: 100 };
  const html = renderToString(
    <CompaniesContainer
      tier={COMPANY_TIER.DIAMOND}
      companies={[{ name: "TestCorp", logoHref: dummyLogo }]}
    />
  );
  
  // For Diamond tier, Company component will generate a Link to /company/TestCorp
  // because hrefByCompanyTier(DIAMOND) returns internal page route when no websiteUrl.
  // If tier was missing, it defaults to BRONZE -> defaults to "/"
  assert.match(html, /href="\/company\/TestCorp"/);
});
