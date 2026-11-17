import { APP_SESSION_TTL_SECONDS } from "@/config/sessionLifetime";
import { branding } from "@/edition/branding";

const config = {
  cookies: {
    auth: {
      name: branding.storage.authCookie,
      maxAge: APP_SESSION_TTL_SECONDS,
    },
  },

  defaultAvatar: "/assets/images/default_user.png",

  localStorage: {
    hideInstallPrompt: branding.storage.hideInstallPrompt,
  },

  uploads: {
    avatar: {
      types: ["image/png", "image/jpeg"],
      maxSize: 5 * 1024 * 1024,
      rateLimit: { windowMs: 60 * 1000, max: 5 },
    },
    logo: {
      types: ["image/png", "image/webp", "image/svg+xml"],
      maxSize: 5 * 1024 * 1024,
    },
    cv: {
      types: ["application/pdf"],
      maxSize: 10 * 1024 * 1024,
      rateLimit: { windowMs: 60 * 1000, max: 5 },
    },
  },

  constants: {
    actionQrCodeRefreshRateMs: 15 * 1000,
    neiContactEmail: "info@nei-isep.org",
  },
};

export default config;
