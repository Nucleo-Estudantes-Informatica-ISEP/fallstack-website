// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { expect, test } from "vitest";

import { config } from "./middleware";

test.each([
  "/api/storage/cv",
  "/api/storage/avatar",
  "/api/admin/storage/avatar",
  "/api/admin/storage/logo",
  "/api/admin/storage/video",
])("streams %s without middleware body cloning", (path) => {
  expect(
    unstable_doesMiddlewareMatch({ config, url: `http://localhost${path}` })
  ).toBe(false);
  expect(
    unstable_doesMiddlewareMatch({ config, url: `http://localhost${path}/` })
  ).toBe(false);
});
test.each([
  "/login",
  "/dashboard",
  "/api/health",
  "/api/storage/cv/other",
  "/api/admin/storage/video-other",
])("retains middleware for %s", (path) => {
  expect(
    unstable_doesMiddlewareMatch({ config, url: `http://localhost${path}` })
  ).toBe(true);
});
