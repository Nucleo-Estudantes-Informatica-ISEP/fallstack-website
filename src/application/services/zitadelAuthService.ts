import "server-only";

import { createHash, createPublicKey, randomBytes } from "crypto";
import jwt, { type Algorithm } from "jsonwebtoken";

import { HttpError } from "@/types/HttpError";
import { serverEnv } from "@/config/env.server";

const APP_SESSION_ISSUER = "fallstack";
const APP_SESSION_AUDIENCE = "fallstack-web";
const APP_SESSION_TTL_SECONDS = 8 * 60 * 60;
const OIDC_STATE_TTL_SECONDS = 10 * 60;

export const oidcCookieNames = {
  state: "@Fallstack:oidc-state",
  nonce: "@Fallstack:oidc-nonce",
  verifier: "@Fallstack:oidc-verifier",
  next: "@Fallstack:oidc-next",
} as const;

interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  id_token_signing_alg_values_supported?: string[];
  end_session_endpoint?: string;
}

interface TokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in?: number;
}

interface JsonWebKeyRecord {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  [key: string]: unknown;
}

interface JwksResponse {
  keys: JsonWebKeyRecord[];
}

type RoleClaim = Record<string, unknown> | string[] | string | undefined;

export interface ZitadelIdentity {
  sub: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  isEmployee: boolean;
  isGlobalAdmin: boolean;
}

export interface AppSessionClaims extends jwt.JwtPayload {
  sub: string;
  email: string;
  name?: string;
  employee: boolean;
  admin: boolean;
}

let discoveryPromise: Promise<OidcDiscovery> | undefined;
let jwksPromise: Promise<JwksResponse> | undefined;

function base64Url(bytes: Buffer) {
  return bytes.toString("base64url");
}

function randomToken(size = 32) {
  return base64Url(randomBytes(size));
}

async function getDiscovery(): Promise<OidcDiscovery> {
  discoveryPromise ??= fetch(
    `${serverEnv.AUTH_ISSUER_URL.replace(/\/$/u, "")}/.well-known/openid-configuration`,
    { cache: "force-cache" }
  ).then(async (response) => {
    if (!response.ok)
      throw new HttpError("Unable to load AuthNEI configuration", 502);

    const body = (await response.json()) as Partial<OidcDiscovery>;
    if (
      !body.issuer ||
      !body.authorization_endpoint ||
      !body.token_endpoint ||
      !body.userinfo_endpoint ||
      !body.jwks_uri
    )
      throw new HttpError("Invalid AuthNEI configuration", 502);

    if (
      body.issuer.replace(/\/$/u, "") !==
      serverEnv.AUTH_ISSUER_URL.replace(/\/$/u, "")
    )
      throw new HttpError("AuthNEI issuer does not match configuration", 502);

    return body as OidcDiscovery;
  });

  return discoveryPromise;
}

async function getJwks(forceRefresh = false): Promise<JwksResponse> {
  if (forceRefresh) jwksPromise = undefined;
  if (jwksPromise) return jwksPromise;

  jwksPromise = getDiscovery().then(async (discovery) => {
    const response = await fetch(discovery.jwks_uri, { cache: "force-cache" });
    if (!response.ok)
      throw new HttpError("Unable to load AuthNEI signing keys", 502);

    const body = (await response.json()) as Partial<JwksResponse>;
    if (!Array.isArray(body.keys))
      throw new HttpError("Invalid AuthNEI signing-key response", 502);

    return { keys: body.keys };
  });

  return jwksPromise;
}

function roleKeys(value: RoleClaim): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return Object.keys(value);
}

function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function verifyIdToken(idToken: string, expectedNonce: string) {
  const discovery = await getDiscovery();
  const decoded = jwt.decode(idToken, { complete: true });

  if (!decoded || typeof decoded.payload === "string")
    throw new HttpError("Invalid AuthNEI ID token", 401);

  const { alg, kid } = decoded.header;
  const advertisedAlgorithms = discovery.id_token_signing_alg_values_supported;

  // Never accept symmetric or unsigned ID tokens from an external IdP. The
  // algorithm also has to be one advertised by the issuer's discovery doc.
  if (
    !alg ||
    alg === "none" ||
    alg.startsWith("HS") ||
    (advertisedAlgorithms && !advertisedAlgorithms.includes(alg))
  )
    throw new HttpError("Unsupported AuthNEI ID-token algorithm", 401);

  if (!kid) throw new HttpError("AuthNEI ID token has no signing-key id", 401);

  let jwks = await getJwks();
  let jwk = jwks.keys.find((candidate) => candidate.kid === kid);

  // ZITADEL rotates signing keys. If a cached set does not contain the token's
  // kid, refresh once before rejecting the login.
  if (!jwk) {
    jwks = await getJwks(true);
    jwk = jwks.keys.find((candidate) => candidate.kid === kid);
  }

  if (!jwk) throw new HttpError("Unknown AuthNEI signing key", 401);

  let publicKey;
  try {
    publicKey = createPublicKey({
      key: jwk as never,
      format: "jwk",
    });
  } catch {
    throw new HttpError("Invalid AuthNEI signing key", 401);
  }

  let claims: string | jwt.JwtPayload;
  try {
    claims = jwt.verify(idToken, publicKey, {
      algorithms: [alg as Algorithm],
      issuer: discovery.issuer,
      audience: serverEnv.AUTH_CLIENT_ID,
    });
  } catch {
    throw new HttpError("Invalid AuthNEI ID token", 401);
  }

  if (
    typeof claims === "string" ||
    !claims.sub ||
    claims.nonce !== expectedNonce
  )
    throw new HttpError("Invalid AuthNEI ID-token claims", 401);

  return claims;
}

export async function createAuthorizationRequest(next?: string | null) {
  const discovery = await getDiscovery();
  const verifier = randomToken(48);
  const state = randomToken();
  const nonce = randomToken();
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("client_id", serverEnv.AUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", serverEnv.AUTH_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", serverEnv.AUTH_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  return {
    url: url.toString(),
    state,
    nonce,
    verifier,
    next: safeNext(next),
    maxAge: OIDC_STATE_TTL_SECONDS,
  };
}

async function exchangeCode(code: string, verifier: string) {
  const discovery = await getDiscovery();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: serverEnv.AUTH_REDIRECT_URI,
    client_id: serverEnv.AUTH_CLIENT_ID,
    code_verifier: verifier,
  });

  const basic = Buffer.from(
    `${serverEnv.AUTH_CLIENT_ID}:${serverEnv.AUTH_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok)
    throw new HttpError("AuthNEI authorization code exchange failed", 401);

  const token = (await response.json()) as Partial<TokenResponse>;
  if (!token.access_token || !token.id_token)
    throw new HttpError(
      "AuthNEI returned an incomplete OIDC token response",
      401
    );

  return token as TokenResponse;
}

export async function completeAuthorizationCode(input: {
  code: string;
  verifier: string;
  expectedNonce: string;
}): Promise<ZitadelIdentity> {
  const token = await exchangeCode(input.code, input.verifier);
  const idTokenClaims = await verifyIdToken(
    token.id_token,
    input.expectedNonce
  );
  const discovery = await getDiscovery();

  // Resolve profile and role claims from UserInfo using the access token, but
  // also require the subject to match the independently verified ID token.
  const response = await fetch(discovery.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new HttpError("Unable to read AuthNEI identity", 401);

  const claims = (await response.json()) as Record<string, unknown>;
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email : "";
  const name = typeof claims.name === "string" ? claims.name : undefined;
  const emailVerified = claims.email_verified === true;

  if (!sub || sub !== idTokenClaims.sub || !email || !emailVerified)
    throw new HttpError("AuthNEI identity is missing a verified email", 403);

  const employeeRoles = roleKeys(
    claims[serverEnv.AUTH_ROLE_CLAIM] as RoleClaim
  );
  const globalRoles = roleKeys(
    claims[serverEnv.AUTH_GLOBAL_ROLE_CLAIM] as RoleClaim
  );

  return {
    sub,
    email,
    name,
    emailVerified,
    isEmployee: employeeRoles.includes("employee"),
    isGlobalAdmin: globalRoles.includes("admin"),
  };
}

export function signAppSession(identity: ZitadelIdentity) {
  return jwt.sign(
    {
      email: identity.email,
      name: identity.name,
      employee: identity.isEmployee,
      admin: identity.isGlobalAdmin,
    },
    serverEnv.AUTH_SECRET,
    {
      algorithm: "HS256",
      subject: identity.sub,
      issuer: APP_SESSION_ISSUER,
      audience: APP_SESSION_AUDIENCE,
      expiresIn: APP_SESSION_TTL_SECONDS,
    }
  );
}

export function verifyAppSession(token: string): AppSessionClaims | null {
  try {
    const claims = jwt.verify(token, serverEnv.AUTH_SECRET, {
      algorithms: ["HS256"],
      issuer: APP_SESSION_ISSUER,
      audience: APP_SESSION_AUDIENCE,
    });
    if (typeof claims === "string" || !claims.sub || !claims.email) return null;
    return claims as AppSessionClaims;
  } catch {
    return null;
  }
}

export async function getLogoutUrl(idTokenHint?: string) {
  const discovery = await getDiscovery();
  if (!discovery.end_session_endpoint)
    return serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI;

  const url = new URL(discovery.end_session_endpoint);
  url.searchParams.set(
    "post_logout_redirect_uri",
    serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI
  );
  url.searchParams.set("client_id", serverEnv.AUTH_CLIENT_ID);
  if (idTokenHint) url.searchParams.set("id_token_hint", idTokenHint);
  return url.toString();
}

export async function assignEmployeeRole(zitadelUserId: string) {
  const endpoint = `${serverEnv.AUTH_ISSUER_URL.replace(/\/$/u, "")}/zitadel.authorization.v2.AuthorizationService/CreateAuthorization`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.ZITADEL_ROLE_ASSIGNER_TOKEN}`,
      "Connect-Protocol-Version": "1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: zitadelUserId,
      projectId: serverEnv.AUTH_PROJECT_ID,
      organizationId: serverEnv.ZITADEL_ORG_ID,
      roleKeys: ["employee"],
    }),
    cache: "no-store",
  });

  if (response.ok) return;

  const text = await response.text();
  if (response.status === 409 || /already|exist|ALREADY_EXISTS/iu.test(text))
    return;

  throw new HttpError("Unable to assign Fallstack employee role", 502);
}
