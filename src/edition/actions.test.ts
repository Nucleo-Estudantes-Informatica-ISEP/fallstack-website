import assert from "node:assert/strict";
import { test } from "vitest";

import { actionNames, getBoothActionName } from "./actions";

test("booth action lookup is case-insensitive and supports edition company names", () => {
  assert.equal(getBoothActionName("AkaPeople"), actionNames.akaPeopleBooth);
  assert.equal(
    getBoothActionName("APR - Technology Solutions"),
    actionNames.aprBooth
  );
  assert.equal(getBoothActionName("hitachi"), actionNames.hitachiBooth);
  assert.equal(getBoothActionName("msg insur:it"), actionNames.msgInsurItBooth);
  assert.equal(getBoothActionName("unknown"), undefined);
});
