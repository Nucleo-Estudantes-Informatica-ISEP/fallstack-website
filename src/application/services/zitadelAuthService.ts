import "server-only";

import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";

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
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
}

interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in?: number;
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
      !body.authorization_endpoint ||
      !body.token_endpoint ||
      !body.userinfo_endpoint
    )
      throw new HttpError("Invalid AuthNEI configuration", 502);

    return body as OidcDiscovery;
  });

  return discoveryPromise;
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

export async function createAuthorizationRequest(next?: string | null) {
  const discovery = await getDiscovery();
  const verifier = randomToken(48);
  const state = randomToken();
  const nonce = randomToken();
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");

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
  if (!token.access_token)
    throw new HttpError("AuthNEI returned no access token", 401);

  return token as TokenResponse;
}

export async function completeAuthorizationCode(input: {
  code: string;
  verifier: string;
  expectedNonce: string;
}): Promise<ZitadelIdentity> {
  const token = await exchangeCode(input.code, input.verifier);
  const discovery = await getDiscovery();

  // Resolve the identity from the issuer's UserInfo endpoint instead of
  // trusting browser-provided claims. The access token was obtained directly
  // from AuthNEI through Authorization Code + PKCE.
  const response = await fetch(discovery.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new HttpError("Unable to read AuthNEI identity", 401);

  const claims = (await response.json()) as Record<string, unknown>;
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email : "";
  const name = typeof claims.name === "string" ? claims.name : undefined;
  const emailVerified = claims.email_verified !== false;

  if (!sub || !email || !emailVerified)
    throw new HttpError("AuthNEI identity is missing a verified email", 403);

  // When an ID token is present, check the nonce from the authorization
  // request before accepting the login. Signature/audience validation remains
  // the issuer's responsibility for UserInfo because we never trust claims
  // extracted from the ID token itself.
  if (token.id_token) {
    const decoded = jwt.decode(token.id_token) as jwt.JwtPayload | null;
    if (!decoded || decoded.nonce !== input.expectedNonce)
      throw new HttpError("Invalid AuthNEI nonce", 401);
  }

  const employeeRoles = roleKeys(claims[serverEnv.AUTH_ROLE_CLAIM] as RoleClaim);
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
  if (!discovery.end_session_endpoint) return serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI;

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
  if (response.status === 409 || /already|exist|ALREADY_EXISTS/iu.test(text)) return;

  throw new HttpError("Unable to assign Fallstack employee role", 502);
}
