import { beforeEach, expect, test, vi } from "vitest";

import { GET, POST } from "./route";

const { createSaveUrlMock, isConfiguredMock } = vi.hoisted(() => ({
  createSaveUrlMock: vi.fn(),
  isConfiguredMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/googleWalletService", () => ({
  createGoogleWalletSaveUrl: createSaveUrlMock,
  isGoogleWalletConfigured: isConfiguredMock,
}));
vi.mock("@/lib/http/server", () => ({
  defineHandler: (config: { handler: (args: unknown) => Promise<Response> }) =>
    config.handler,
}));

beforeEach(() => {
  createSaveUrlMock.mockReset();
  isConfiguredMock.mockReset();
});

test("reports Wallet availability from server configuration", async () => {
  isConfiguredMock.mockReturnValue(false);
  const response = await (GET as unknown as () => Promise<Response>)();
  await expect(response.json()).resolves.toEqual({ enabled: false });
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
