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
  },
};

export default config;
