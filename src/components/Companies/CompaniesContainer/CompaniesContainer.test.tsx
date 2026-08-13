import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { test } from "vitest";

import CompaniesContainer from "./index";

test("CompaniesContainer routes to the internal page when the rank has one and there's content", () => {
  const html = renderToString(
    <CompaniesContainer
      rank={{
        id: "rank-1",
        name: "Diamond",
        order: 0,
        style: {
          gradientFromColor: "#000999",
          gradientFromStop: "13%",
          gradientToColor: "#3284FF",
          gradientToStop: "89%",
          hasInternalPage: true,
          showsPromoVideo: true,
        },
      }}
      companies={[
        {
          name: "TestCorp",
          logoHref: "/dummy.png",
          hasContent: true,
          rankStyle: { hasInternalPage: true },
        },
      ]}
    />
  );

  // A rank with hasInternalPage generates a Link to /company/TestCorp when
  // the company has content (CompanyProfile) to show there - see
  // domain/company/services/rank-access.ts's companyProfileHref.
  assert.match(html, /href="\/company\/TestCorp"/);
});
