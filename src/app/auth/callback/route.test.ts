import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env.client", () => ({
  clientEnv: { NEXT_PUBLIC_BASE_URL: "https://fallstack.nei-isep.org/api" },
}));
vi.mock("@/application/services/authApplicationService", () => ({
  completeOAuthSignIn: vi.fn(),
}));
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

test("redirects callback failures to the public app origin", async () => {
  const { GET } = await import("./route");
  const response = await GET(
    new NextRequest("http://0.0.0.0:4000/auth/callback")
  );

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://fallstack.nei-isep.org/auth/auth-code-error"
  );
});
