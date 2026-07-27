import { branding } from "@/edition/branding";

const config = {
  cookies: {
    auth: {
      name: branding.storage.authCookie,
      maxAge: 34560000, // 400 days (in seconds) - its the maximum value for the maxAge of a cookie
    },
  },

  defaultAvatar: "/assets/images/default_user.png",

  localStorage: {
    hideInstallPrompt: branding.storage.hideInstallPrompt,
  },

  uploads: {
    avatar: {
      types: ["image/png", "image/jpeg"],
      maxSize: 5 * 1024 * 1024, // 50mb
      rateLimit: { windowMs: 60 * 1000, max: 5 }, // 5 uploads per minute per IP
    },
    cv: {
      types: ["application/pdf"],
      maxSize: 10 * 1024 * 1024, // 50mb
      rateLimit: { windowMs: 60 * 1000, max: 5 }, // 5 uploads per minute per IP
    },
  },

  constants: {
    actionQrCodeRefreshRateMs: 15 * 1000, // 15 seconds
    neiContactEmail: "info@nei-isep.org",
    // GoTrue's built-in "keycloak" external provider id, repurposed for
    // AuthNEI (NEI's self-hosted Zitadel instance) - that provider is just
    // generic OIDC-discovery under the hood (GOTRUE_EXTERNAL_KEYCLOAK_URL
    // pointing at Zitadel's issuer), not literally Keycloak. GoTrue has no
    // mechanism for an arbitrarily-named external provider, so it's this
    // fixed id rather than something AuthNEI-specific. Not a secret - safe
    // to reference directly as a string constant.
    authneiProvider: "keycloak",
  },
};

export default config;
