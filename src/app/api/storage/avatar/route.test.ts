import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

test("rejects an unauthenticated upload with 401", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);

  const req = new NextRequest("http://localhost/api/storage/avatar", {
    method: "POST",
  });

  const res = await POST(req);

  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: "Unauthorized" });
});
