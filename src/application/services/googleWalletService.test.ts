import { beforeEach, expect, test, vi } from "vitest";

const { serverEnvMock, signMock } = vi.hoisted(() => ({
  serverEnvMock: {
    GOOGLE_WALLET_ISSUER_ID: undefined as string | undefined,
    GOOGLE_WALLET_CLASS_ID: undefined as string | undefined,
    GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64: undefined as string | undefined,
  },
  signMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("jsonwebtoken", () => ({ default: { sign: signMock } }));
vi.mock("@/config/env.client", () => ({
  clientEnv: { NEXT_PUBLIC_BASE_URL: "https://staging.fallstack.pt/api" },
}));
vi.mock("@/config/env.server", () => ({ serverEnv: serverEnvMock }));

const student = {
  id: "11111111-2222-3333-4444-555555555555",
  code: "AB12",
  name: "Student Example",
};

const validCredentials = Buffer.from(
  JSON.stringify({
    client_email: "wallet@example.iam.gserviceaccount.com",
    private_key: "private-key",
  })
).toString("base64");

function oauthResponse() {
  return new Response(
    JSON.stringify({ access_token: "access-token", expires_in: 3600 }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  serverEnvMock.GOOGLE_WALLET_ISSUER_ID = "123456789";
  serverEnvMock.GOOGLE_WALLET_CLASS_ID = "123456789.fallstack-2026-staging";
  serverEnvMock.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = validCredentials;
  signMock.mockImplementation((claims: { aud?: string }) =>
    claims.aud === "https://oauth2.googleapis.com/token"
      ? "oauth-assertion"
      : "save-jwt"
  );
});

test("uses the edition's deterministic Wallet object prefix", async () => {
  const { buildGoogleWalletObjectId } = await import("./googleWalletService");

  expect(buildGoogleWalletObjectId("123456789", student.id)).toBe(
    "123456789.fallstack-2026-11111111-2222-3333-4444-555555555555"
  );
});

test("rejects missing Wallet configuration with 503", async () => {
  serverEnvMock.GOOGLE_WALLET_ISSUER_ID = undefined;
  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");

  await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
    message: "Google Wallet is not configured",
    status: 503,
  });
});

test("rejects an issuer and class mismatch with 503", async () => {
  serverEnvMock.GOOGLE_WALLET_CLASS_ID = "987654321.fallstack-2026";
  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");

  await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
    message: "Google Wallet class does not belong to this issuer",
    status: 503,
  });
});

test("rejects malformed base64 credentials with 503", async () => {
  serverEnvMock.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = "not-base64!";
  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");

  await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
    message: "Google Wallet credentials are invalid",
    status: 503,
  });
});

test("rejects malformed credential JSON with 503", async () => {
  serverEnvMock.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 =
    Buffer.from("not-json").toString("base64");
  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");

  await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
    message: "Google Wallet credentials are invalid",
    status: 503,
  });
});

test("creates a Generic Object whose barcode is the stable student code", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(oauthResponse())
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const { buildGoogleWalletObjectId, createGoogleWalletSaveUrl } =
    await import("./googleWalletService");
  await expect(createGoogleWalletSaveUrl(student)).resolves.toBe(
    "https://pay.google.com/gp/v/save/save-jwt"
  );

  const insertInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
  const object = JSON.parse(String(insertInit.body));
  expect(object).toMatchObject({
    id: buildGoogleWalletObjectId("123456789", student.id),
    classId: "123456789.fallstack-2026-staging",
    cardTitle: {
      defaultValue: { language: "pt-PT", value: "Fallstack 2026" },
    },
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
    .mockResolvedValueOnce(oauthResponse())
    .mockResolvedValueOnce(new Response("{}", { status: 200 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");
  await createGoogleWalletSaveUrl(student);

  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(fetchMock.mock.calls[2]?.[1]).toEqual(
    expect.objectContaining({ method: "PATCH" })
  );
});

test("patches after a concurrent insert returns 409", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(oauthResponse())
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response("{}", { status: 409 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");
  await createGoogleWalletSaveUrl(student);

  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(fetchMock.mock.calls[3]?.[1]).toEqual(
    expect.objectContaining({ method: "PATCH" })
  );
});

test("reuses a valid OAuth access token across Wallet requests", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(oauthResponse())
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");
  await createGoogleWalletSaveUrl(student);
  await createGoogleWalletSaveUrl(student);

  expect(
    fetchMock.mock.calls.filter(
      ([url]) => String(url) === "https://oauth2.googleapis.com/token"
    )
  ).toHaveLength(1);
  expect(fetchMock).toHaveBeenCalledTimes(5);
});
