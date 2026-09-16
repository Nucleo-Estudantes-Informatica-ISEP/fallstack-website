import { beforeEach, expect, test, vi } from "vitest";

const { signMock } = vi.hoisted(() => ({ signMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("jsonwebtoken", () => ({ default: { sign: signMock } }));
vi.mock("@/config/env.client", () => ({
  clientEnv: { NEXT_PUBLIC_BASE_URL: "https://staging.fallstack.pt/api" },
}));
vi.mock("@/config/env.server", () => ({
  serverEnv: {
    GOOGLE_WALLET_ISSUER_ID: "123456789",
    GOOGLE_WALLET_CLASS_ID: "123456789.fallstack-2026-staging",
    GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64: Buffer.from(
      JSON.stringify({
        client_email: "wallet@example.iam.gserviceaccount.com",
        private_key: "private-key",
      })
    ).toString("base64"),
  },
}));

import {
  buildGoogleWalletObjectId,
  createGoogleWalletSaveUrl,
} from "./googleWalletService";

const student = {
  id: "11111111-2222-3333-4444-555555555555",
  code: "AB12",
  name: "Student Example",
};

beforeEach(() => {
  vi.restoreAllMocks();
  signMock.mockImplementation((claims: { aud?: string }) =>
    claims.aud === "https://oauth2.googleapis.com/token"
      ? "oauth-assertion"
      : "save-jwt"
  );
});

test("uses a deterministic Wallet object id for the student", () => {
  expect(buildGoogleWalletObjectId("123456789", student.id)).toBe(
    "123456789.fallstack-2026-11111111-2222-3333-4444-555555555555"
  );
});

test("creates a Generic Object whose barcode is the stable student code", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(createGoogleWalletSaveUrl(student)).resolves.toBe(
    "https://pay.google.com/gp/v/save/save-jwt"
  );

  const insertInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
  const object = JSON.parse(String(insertInit.body));
  expect(object).toMatchObject({
    id: buildGoogleWalletObjectId("123456789", student.id),
    classId: "123456789.fallstack-2026-staging",
    barcode: { type: "QR_CODE", value: "AB12", alternateText: "AB12" },
  });

  expect(signMock).toHaveBeenLastCalledWith(
    expect.objectContaining({
      aud: "google",
      typ: "savetowallet",
      origins: ["https://staging.fallstack.pt"],
      payload: {
        genericObjects: [
          { id: buildGoogleWalletObjectId("123456789", student.id) },
        ],
      },
    }),
    "private-key",
    { algorithm: "RS256" }
  );
});

test("patches an existing object instead of creating a duplicate", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    .mockResolvedValueOnce(new Response("{}", { status: 200 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await createGoogleWalletSaveUrl(student);

  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(fetchMock.mock.calls[2]?.[1]).toEqual(
    expect.objectContaining({ method: "PATCH" })
  );
});
