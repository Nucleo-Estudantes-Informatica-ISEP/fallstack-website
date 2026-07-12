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
    },
    cv: {
      types: ["application/pdf"],
      maxSize: 10 * 1024 * 1024, // 50mb
    },
  },

  constants: {
    actionQrCodeRefreshRateMs: 15 * 1000, // 15 seconds
  },
};

export default config;
