import "server-only";

import jwt from "jsonwebtoken";
import { z } from "zod";

import { HttpError } from "@/types/HttpError";
import { clientEnv } from "@/config/env.client";
import { serverEnv } from "@/config/env.server";
import { reportError } from "@/lib/logger";
import { edition } from "@/edition";

const WALLET_API_BASE = "https://walletobjects.googleapis.com/walletobjects/v1";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000;

const serviceAccountSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
});

const oauthTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

type WalletStudent = {
  id: string;
  code: string;
  name: string;
};

type WalletCredentials = z.infer<typeof serviceAccountSchema>;

type GenericObject = ReturnType<typeof buildGenericObject>;

type CachedAccessToken = {
  clientEmail: string;
  value: string;
  expiresAt: number;
};

let cachedAccessToken: CachedAccessToken | undefined;
let accessTokenRequest:
  { clientEmail: string; promise: Promise<string> } | undefined;

function localized(value: string) {
  return {
    defaultValue: {
      language: "pt-PT",
      value,
    },
  };
}

function getWalletConfig() {
  const issuerId = serverEnv.GOOGLE_WALLET_ISSUER_ID;
  const classId = serverEnv.GOOGLE_WALLET_CLASS_ID;
  const encodedCredentials = serverEnv.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_B64;

  if (!issuerId || !classId || !encodedCredentials)
    throw new HttpError("Google Wallet is not configured", 503);

  if (!classId.startsWith(`${issuerId}.`))
    throw new HttpError(
      "Google Wallet class does not belong to this issuer",
      503
    );

  let credentials: WalletCredentials;
  try {
    const encoded = encodedCredentials.replace(/\s+/g, "");
    const decodedBuffer = Buffer.from(encoded, "base64");
    if (decodedBuffer.toString("base64") !== encoded) throw new Error();
    const decoded = decodedBuffer.toString("utf8");
    credentials = serviceAccountSchema.parse(JSON.parse(decoded));
  } catch {
    throw new HttpError("Google Wallet credentials are invalid", 503);
  }

  return {
    issuerId,
    classId,
    credentials,
    origin: new URL(clientEnv.NEXT_PUBLIC_BASE_URL).origin,
  };
}

export function isGoogleWalletConfigured() {
  try {
    getWalletConfig();
    return true;
  } catch (error) {
    if (error instanceof HttpError && error.status === 503) return false;
    throw error;
  }
}

export function buildGoogleWalletObjectId(classId: string, studentId: string) {
  return `${classId}-${studentId}`;
}

function buildGenericObject(classId: string, student: WalletStudent) {
  return {
    id: buildGoogleWalletObjectId(classId, student.id),
    classId,
    state: "ACTIVE" as const,
    cardTitle: localized(edition.branding.wallet.cardTitle),
    subheader: localized(`Código ${student.code}`),
    header: localized(student.name),
    barcode: {
      type: "QR_CODE" as const,
      value: student.code,
      alternateText: student.code,
    },
  };
}

// Google error messages can contain object IDs or account data. Log only
// machine-readable fields with a restricted character set.
async function reportGoogleApiError(response: Response, operation: string) {
  const body: unknown = await response.json().catch(() => undefined);
  const envelope =
    body && typeof body === "object" && "error" in body
      ? body.error
      : undefined;
  const error = envelope && typeof envelope === "object" ? envelope : undefined;
  const safeCode = (value: unknown) =>
    typeof value === "string" && /^[A-Za-z_]{1,64}$/.test(value)
      ? value
      : undefined;

  reportError(
    new Error(`Google Wallet ${operation} failed`),
    {
      operation: `google_wallet_${operation}`,
      upstreamStatus: response.status,
      upstreamErrorCode:
        error && "code" in error && typeof error.code === "number"
          ? error.code
          : undefined,
      upstreamErrorStatus:
        error && "status" in error ? safeCode(error.status) : undefined,
      upstreamOAuthError: safeCode(envelope),
    },
    "Google Wallet upstream request failed"
  );
}

async function requestAccessToken(credentials: WalletCredentials) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: credentials.client_email,
      scope: WALLET_SCOPE,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 60 * 60,
    },
    credentials.private_key,
    { algorithm: "RS256" }
  );

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    await reportGoogleApiError(response, "oauth");
    throw new HttpError("Unable to authenticate with Google Wallet", 502);
  }

  const parsed = oauthTokenSchema.safeParse(
    await response.json().catch(() => undefined)
  );
  if (!parsed.success) {
    reportError(
      new Error("Invalid Google Wallet OAuth response"),
      { operation: "google_wallet_oauth", upstreamStatus: response.status },
      "Google Wallet returned an invalid OAuth response"
    );
    throw new HttpError(
      "Google Wallet returned an invalid OAuth response",
      502
    );
  }

  return parsed.data;
}

async function getAccessToken(credentials: WalletCredentials) {
  const now = Date.now();
  if (
    cachedAccessToken?.clientEmail === credentials.client_email &&
    cachedAccessToken.expiresAt - ACCESS_TOKEN_REFRESH_SKEW_MS > now
  )
    return cachedAccessToken.value;

  if (accessTokenRequest?.clientEmail === credentials.client_email)
    return accessTokenRequest.promise;

  const promise = requestAccessToken(credentials)
    .then(({ access_token, expires_in }) => {
      cachedAccessToken = {
        clientEmail: credentials.client_email,
        value: access_token,
        expiresAt: Date.now() + expires_in * 1000,
      };
      return access_token;
    })
    .finally(() => {
      if (accessTokenRequest?.promise === promise)
        accessTokenRequest = undefined;
    });

  accessTokenRequest = {
    clientEmail: credentials.client_email,
    promise,
  };
  return promise;
}

function walletHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function patchGenericObject(object: GenericObject, accessToken: string) {
  const { id: _id, classId: _classId, ...mutableFields } = object;
  const response = await fetch(
    `${WALLET_API_BASE}/genericObject/${encodeURIComponent(object.id)}`,
    {
      method: "PATCH",
      headers: walletHeaders(accessToken),
      body: JSON.stringify(mutableFields),
    }
  );

  if (!response.ok) {
    await reportGoogleApiError(response, "patch");
    throw new HttpError("Unable to update Google Wallet pass", 502);
  }
}

async function syncGenericObject(object: GenericObject, accessToken: string) {
  const objectUrl = `${WALLET_API_BASE}/genericObject/${encodeURIComponent(object.id)}`;
  const existing = await fetch(objectUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (existing.ok) {
    await patchGenericObject(object, accessToken);
    return;
  }

  if (existing.status !== 404) {
    await reportGoogleApiError(existing, "get");
    throw new HttpError("Unable to read Google Wallet pass", 502);
  }

  const inserted = await fetch(`${WALLET_API_BASE}/genericObject`, {
    method: "POST",
    headers: walletHeaders(accessToken),
    body: JSON.stringify(object),
  });

  if (inserted.ok) return;

  // A simultaneous retry may have created the deterministic object after our
  // GET but before our POST. Reconcile it instead of creating another object.
  if (inserted.status === 409) {
    await patchGenericObject(object, accessToken);
    return;
  }

  await reportGoogleApiError(inserted, "insert");
  throw new HttpError("Unable to create Google Wallet pass", 502);
}

function createSaveUrl(
  objectId: string,
  credentials: WalletCredentials,
  origin: string
) {
  const signedJwt = jwt.sign(
    {
      iss: credentials.client_email,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      origins: [origin],
      payload: {
        genericObjects: [{ id: objectId }],
      },
    },
    credentials.private_key,
    { algorithm: "RS256" }
  );

  return `https://pay.google.com/gp/v/save/${signedJwt}`;
}

export async function createGoogleWalletSaveUrl(student: WalletStudent) {
  const { classId, credentials, origin } = getWalletConfig();
  const object = buildGenericObject(classId, student);
  const accessToken = await getAccessToken(credentials);

  await syncGenericObject(object, accessToken);

  return createSaveUrl(object.id, credentials, origin);
}
