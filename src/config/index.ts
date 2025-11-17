const config = {
  cookies: {
    auth: {
      name: "@Fallstack25:auth",
      maxAge: 34560000, // 400 days (in seconds) - its the maximum value for the maxAge of a cookie
    },
  },

  defaultAvatar: "/assets/images/default_user.png",

  localStorage: {
    hideInstallPrompt: "@Fallstack25:hidePrompt",
  },

  uploads: {
    avatar: {
      types: ["image/png", "image/jpeg"],
      maxSize: 5 * 1024 * 1024, // 5mb
    },
    cv: {
      types: ["application/pdf"],
      maxSize: 5 * 1024 * 1024, // 5mb
    },
  },

  constants: {
    actionQrCodeRefreshRateMs: 15 * 1000, // 15 seconds

    actionNames: {
      createProfile: "Cria o teu Perfil",
      uploadCv: "Faz o Upload do teu CV",
      updateLinkedin: "Associa o teu LinkedIn",
      akaPeopleBooth: "Banca AkaPeople",
      natixisBooth: "Banca Natixis",
      aprBooth: "Banca APR",
      hitachiBooth: "Banca Hitachi",
      convatecBooth: "Banca Convatec",
      niwBooth: "Banca NiW",
      deloitteBooth: "Banca Deloitte",
      accentureBooth: "Banca Accenture",
      armisBooth: "Banca Armis",
      devscopeBooth: "Banca Devscope",
      msgInsurItBooth: "Banca msg insur:it",
      glinttBooth: "Banca Glintt",
      konkConsultingBooth: "Banca konk consulting",
    },
  },
};

export default config;
