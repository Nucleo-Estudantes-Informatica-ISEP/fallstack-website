import { beforeEach, expect, test, vi } from "vitest";

const { serverEnvMock, signMock, reportErrorMock, lockedUserMock } = vi.hoisted(
  () => ({
    serverEnvMock: {
      GOOGLE_WALLET_ISSUER_ID: undefined as string | undefined,
      GOOGLE_WALLET_CLASS_ID: undefined as string | undefined,
      GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64: undefined as string | undefined,
    },
    lockedUserMock: vi.fn(),
    signMock: vi.fn(),
    reportErrorMock: vi.fn(),
  })
);

vi.mock("server-only", () => ({}));
vi.mock("../repositories/userRepository", () => ({
  withLockedUser: lockedUserMock,
}));
vi.mock("jsonwebtoken", () => ({ default: { sign: signMock } }));
vi.mock("@/config/env.client", () => ({
  clientEnv: { NEXT_PUBLIC_BASE_URL: "https://staging.fallstack.pt/api" },
}));
vi.mock("@/config/env.server", () => ({ serverEnv: serverEnvMock }));
vi.mock("@/lib/logger", () => ({ reportError: reportErrorMock }));

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
  lockedUserMock.mockImplementation(async (_id, callback) =>
    callback({ active: true, student }, {})
  );
  serverEnvMock.GOOGLE_WALLET_ISSUER_ID = "123456789";
  serverEnvMock.GOOGLE_WALLET_CLASS_ID = "123456789.fallstack-2026-staging";
  serverEnvMock.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = validCredentials;
  signMock.mockImplementation((claims: { aud?: string }) =>
    claims.aud === "https://oauth2.googleapis.com/token"
      ? "oauth-assertion"
      : "save-jwt"
  );
});

test("scopes deterministic Wallet object IDs to the configured class", async () => {
  const { buildGoogleWalletObjectId } = await import("./googleWalletService");

  expect(
    buildGoogleWalletObjectId("123456789.fallstack-2026-staging", student.id)
  ).toBe(
    "123456789.fallstack-2026-staging-11111111-2222-3333-4444-555555555555"
  );
  expect(
    buildGoogleWalletObjectId("123456789.fallstack-2026", student.id)
  ).not.toBe(
    buildGoogleWalletObjectId("123456789.fallstack-2026-staging", student.id)
  );
});

test("hides Wallet availability until all credentials are valid", async () => {
  const { isGoogleWalletConfigured } = await import("./googleWalletService");
  expect(isGoogleWalletConfigured()).toBe(true);
  serverEnvMock.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = "invalid!";
  expect(isGoogleWalletConfigured()).toBe(false);
});

test("accepts base64 credentials wrapped across lines", async () => {
  serverEnvMock.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = validCredentials
    .match(/.{1,64}/g)!
    .join("\n");
  const { isGoogleWalletConfigured } = await import("./googleWalletService");
  expect(isGoogleWalletConfigured()).toBe(true);
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
    id: buildGoogleWalletObjectId(
      "123456789.fallstack-2026-staging",
      student.id
    ),
    classId: "123456789.fallstack-2026-staging",
    cardTitle: {
      defaultValue: { language: "pt-PT", value: "Fallstack 2026" },
    },
    barcode: { type: "QR_CODE", value: "AB12", alternateText: "AB12" },
    validTimeInterval: {
      start: { date: "2026-11-17T08:30:00+00:00" },
      end: { date: "2026-11-18T17:30:00+00:00" },
    },
  });

  expect(signMock).toHaveBeenLastCalledWith(
    expect.objectContaining({
      aud: "google",
      typ: "savetowallet",
      origins: ["https://staging.fallstack.pt"],
      payload: {
        genericObjects: [
          {
            id: buildGoogleWalletObjectId(
              "123456789.fallstack-2026-staging",
              student.id
            ),
          },
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

  expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
    validTimeInterval: {
      start: { date: "2026-11-17T08:30:00+00:00" },
      end: { date: "2026-11-18T17:30:00+00:00" },
    },
  });
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

test("reports an upstream OAuth status without logging a sensitive response message", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        error: "invalid_grant",
        error_description: "private student@example.com token-secret",
      }),
      { status: 400 }
    )
  );
  vi.stubGlobal("fetch", fetchMock);

  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");
  await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
    status: 502,
  });
  expect(reportErrorMock).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({
      operation: "google_wallet_oauth",
      upstreamStatus: 400,
      upstreamOAuthError: "invalid_grant",
    }),
    "Google Wallet upstream request failed"
  );
  expect(JSON.stringify(reportErrorMock.mock.calls)).not.toContain(
    "student@example.com"
  );
  expect(JSON.stringify(reportErrorMock.mock.calls)).not.toContain(
    "token-secret"
  );
});

test("does not reactivate a pass from a session resolved before account deletion", async () => {
  lockedUserMock.mockImplementation(async (_id, callback) =>
    callback(null, {})
  );
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(oauthResponse());
  vi.stubGlobal("fetch", fetchMock);
  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");
  await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
    status: 403,
  });
  expect(
    fetchMock.mock.calls.some(([url]) => String(url).includes("/genericObject"))
  ).toBe(false);
});

test("expires and anonymizes the deterministic object on account deletion", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(oauthResponse())
    .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const { revokeGoogleWalletPass, buildGoogleWalletObjectId } =
    await import("./googleWalletService");
  await revokeGoogleWalletPass(student.id);
  expect(fetchMock.mock.calls[1]?.[0]).toBe(
    `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${buildGoogleWalletObjectId("123456789.fallstack-2026-staging", student.id)}`
  );
  const init = fetchMock.mock.calls[1]?.[1];
  expect(init).toMatchObject({ method: "PATCH" });
  expect(JSON.parse(String(init?.body))).toEqual({
    state: "EXPIRED",
    header: { defaultValue: { language: "pt-PT", value: "Passe revogado" } },
    subheader: {
      defaultValue: { language: "pt-PT", value: "Conta eliminada" },
    },
    barcode: { type: "QR_CODE", value: "REVOKED", alternateText: "Revogado" },
  });
});

test.each([200, 404])(
  "revocation is safe to repeat when Google returns %s",
  async (status) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(oauthResponse())
      .mockResolvedValue(new Response("{}", { status }));
    vi.stubGlobal("fetch", fetchMock);
    const { revokeGoogleWalletPass } = await import("./googleWalletService");
    await revokeGoogleWalletPass(student.id);
    await revokeGoogleWalletPass(student.id);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }
);

test("skips revocation only when Wallet is entirely disabled", async () => {
  serverEnvMock.GOOGLE_WALLET_ISSUER_ID = undefined;
  serverEnvMock.GOOGLE_WALLET_CLASS_ID = undefined;
  serverEnvMock.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = undefined;
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { revokeGoogleWalletPass } = await import("./googleWalletService");
  await revokeGoogleWalletPass(student.id);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("rejects partial configuration rather than skipping revocation", async () => {
  serverEnvMock.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64 = undefined;
  const { revokeGoogleWalletPass } = await import("./googleWalletService");
  await expect(revokeGoogleWalletPass(student.id)).rejects.toMatchObject({
    status: 503,
  });
});

test("propagates a revocation failure for a safe account-deletion retry", async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(oauthResponse())
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { status: "UNAVAILABLE", message: student.code },
        }),
        { status: 503 }
      )
    );
  vi.stubGlobal("fetch", fetchMock);
  const { revokeGoogleWalletPass } = await import("./googleWalletService");
  await expect(revokeGoogleWalletPass(student.id)).rejects.toMatchObject({
    status: 502,
  });
  expect(JSON.stringify(reportErrorMock.mock.calls)).not.toContain(
    student.code
  );
});

test("rejects issuance for an account deactivated after session resolution", async () => {
  lockedUserMock.mockImplementation(async (_id, callback) =>
    callback({ active: false, student }, {})
  );
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(oauthResponse())
  );
  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");
  await expect(createGoogleWalletSaveUrl(student)).rejects.toMatchObject({
    status: 403,
  });
});

test("uses current profile data after acquiring the account lock", async () => {
  lockedUserMock.mockImplementation(async (_id, callback) =>
    callback(
      { active: true, student: { ...student, name: "Updated Student" } },
      {}
    )
  );
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(oauthResponse())
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const { createGoogleWalletSaveUrl } = await import("./googleWalletService");
  await createGoogleWalletSaveUrl(student);
  expect(
    JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)).header.defaultValue
      .value
  ).toBe("Updated Student");
});
