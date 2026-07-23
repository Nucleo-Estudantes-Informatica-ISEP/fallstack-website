import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { test } from "vitest";

import { COMPANY_TIER } from "@/domain/company/company-tier";

import CompaniesContainer from "./index";

test("CompaniesContainer passes tier down to Company cards", () => {
  const html = renderToString(
    <CompaniesContainer
      tier={COMPANY_TIER.DIAMOND}
      companies={[
        {
          name: "TestCorp",
          logoHref: "/dummy.png",
          modalInformation: { title: "TestCorp", bodyText: "About TestCorp" },
        },
      ]}
    />
  );

  // For Diamond tier, Company component will generate a Link to /company/TestCorp
  // because hrefByCompanyTier(DIAMOND) returns the internal page route when the
  // company has edition content (modalInformation) to show there.
  // If tier was missing, it defaults to BRONZE -> defaults to "/"
  assert.match(html, /href="\/company\/TestCorp"/);
});
