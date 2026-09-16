import { beforeEach, expect, test, vi } from "vitest";

const { createSaveUrlMock } = vi.hoisted(() => ({
  createSaveUrlMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/googleWalletService", () => ({
  createGoogleWalletSaveUrl: createSaveUrlMock,
}));
vi.mock("@/lib/http/server", () => ({
  defineHandler: (config: { handler: (args: unknown) => Promise<Response> }) =>
    config.handler,
}));

import { POST } from "./route";

beforeEach(() => {
  createSaveUrlMock.mockReset();
});

test("builds the pass only from the authenticated student's session data", async () => {
  createSaveUrlMock.mockResolvedValue(
    "https://pay.google.com/gp/v/save/signed-jwt"
  );

  const handler = POST as unknown as (args: {
    session: {
      student: { id: string; code: string; name: string };
    };
  }) => Promise<Response>;

  const response = await handler({
    session: {
      student: {
        id: "11111111-2222-3333-4444-555555555555",
        code: "AB12",
        name: "Student Example",
      },
    },
  });

  expect(createSaveUrlMock).toHaveBeenCalledWith({
    id: "11111111-2222-3333-4444-555555555555",
    code: "AB12",
    name: "Student Example",
  });
  await expect(response.json()).resolves.toEqual({
    url: "https://pay.google.com/gp/v/save/signed-jwt",
  });
});
