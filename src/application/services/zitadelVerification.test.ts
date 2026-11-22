// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { afterEach, expect, test, vi } from "vitest";

import {
  AuthNeiEmailVerificationRequired,
  completeAuthorizationCode,
} from "./zitadelAuthService";

const issuer = "https://auth.example.test";
const client = "fixture-client";
const nonce = "fixture-nonce";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

vi.mock("server-only", () => ({}));
vi.mock("@/config/env.server", () => ({
  serverEnv: {
    AUTH_ISSUER_URL: "https://auth.example.test",
    AUTH_CLIENT_ID: "fixture-client",
    AUTH_CLIENT_SECRET: "fixture",
    AUTH_REDIRECT_URI:
      "https://fallstack.example.test/api/auth/callback/zitadel",
  },
}));

afterEach(() => vi.unstubAllGlobals());

test.each([
  [true, "account", true],
  [false, "account", "verification"],
  [undefined, "account", "verification"],
  [false, "other-account", "rejected"],
])(
  "checks verification=%s and UserInfo subject=%s",
  async (verified, subject, outcome) => {
    const idToken = jwt.sign({ nonce }, privateKey, {
      algorithm: "RS256",
      audience: client,
      issuer,
      keyid: "fixture-key",
      subject: "account",
    });
    const document = {
      issuer,
      authorization_endpoint: issuer + "/authorize",
      token_endpoint: issuer + "/token",
      userinfo_endpoint: issuer + "/userinfo",
      jwks_uri: issuer + "/keys",
      id_token_signing_alg_values_supported: ["RS256"],
    };
    const replies = {
      "/.well-known/openid-configuration": document,
      "/keys": {
        keys: [{ ...publicKey.export({ format: "jwk" }), kid: "fixture-key" }],
      },
      "/token": { access_token: "fixture-access-token", id_token: idToken },
      "/userinfo": {
        sub: subject,
        email: "student@example.test",
        email_verified: verified,
      },
    };
    vi.stubGlobal("fetch", async (url: string) =>
      Response.json(replies[new URL(url).pathname as keyof typeof replies])
    );

    const authorization = completeAuthorizationCode({
      code: "fixture",
      verifier: "fixture",
      expectedNonce: nonce,
    });

    if (outcome === true) {
      await expect(authorization).resolves.toMatchObject({
        sub: "account",
        emailVerified: true,
      });
    } else if (outcome === "verification") {
      await expect(authorization).rejects.toBeInstanceOf(
        AuthNeiEmailVerificationRequired
      );
      await expect(authorization).rejects.toMatchObject({
        loginHint: "student@example.test",
      });
    } else {
      await expect(authorization).rejects.not.toBeInstanceOf(
        AuthNeiEmailVerificationRequired
      );
      await expect(authorization).rejects.toMatchObject({ status: 403 });
    }
  }
);
