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
      maxSize: 5 * 1024 * 1024, // 5 MB
      rateLimit: { windowMs: 60 * 1000, max: 5 }, // 5 upload tickets/minute/student
    },
    cv: {
      types: ["application/pdf"],
      maxSize: 10 * 1024 * 1024, // 10 MB
      rateLimit: { windowMs: 60 * 1000, max: 5 }, // 5 upload tickets/minute/student
    },
  },

  constants: {
    actionQrCodeRefreshRateMs: 15 * 1000, // 15 seconds
    neiContactEmail: "info@nei-isep.org",
    // GoTrue's DB-backed custom OAuth/OIDC provider id for AuthNEI (NEI's
    // self-hosted Zitadel instance): any "custom:<id>" provider name is
    // resolved against a provider registered via GoTrue's admin API
    // (POST /admin/custom-providers, gated by GOTRUE_CUSTOM_OAUTH_ENABLED/
    // GOTRUE_CUSTOM_OAUTH_MAX_PROVIDERS), which does real OIDC discovery
    // against whatever issuer URL it's given - unlike GoTrue's fixed-name
    // built-in providers (e.g. "keycloak", which hardcodes Keycloak-specific
    // endpoint paths and doesn't work against a non-Keycloak issuer like
    // Zitadel). Not a secret - safe to reference directly as a string
    // constant; the actual client id/secret/issuer live in GoTrue's config,
    // not here.
    authneiProvider: "custom:authnei",
  },
};

export default config;
