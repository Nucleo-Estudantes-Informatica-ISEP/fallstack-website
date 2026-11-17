export const branding = {
  name: "Fallstack",
  year: 2026,
  editionNumber: 9,
  editionOrdinal: "9ª",
  siteUrl: "https://fallstack.nei-isep.org",
  stagingUrl: "https://staging.fallstack.nei-isep.org",
  event: {
    // Use each date's Europe/Lisbon offset: +00:00 in winter, +01:00 in summer.
    startsAt: "2026-11-17T08:30:00+00:00",
    endsAt: "2026-11-18T17:30:00+00:00",
    days: [17, 18],
    month: "novembro",
    beginningTime: "8:30h",
    endTime: "17:30h",
    venue: "ISEP",
    venueFull: "Instituto Superior de Engenharia do Porto (ISEP)",
    address: {
      street: "Rua Dr. António Bernardino de Almeida, 431",
      city: "Porto",
      postalCode: "4200-072",
      country: "PT",
    },
    scheduleDayTitles: ["17 de Novembro", "18 de Novembro"],
  },
  metadata: {
    applicationName: "Fallstack 2026",
    title: "Fallstack 2026 - 9ª Edição | Evento de Tecnologia no ISEP",
    description:
      "O Fallstack 2026 está de volta para a sua 9ª edição no ISEP a 17 e 18 de novembro. O maior evento de empregabilidade e tecnologia organizado pelo Núcleo de Estudantes de Informática do ISEP (NEI-ISEP).",
    keywords: [
      "Fallstack",
      "Fallstack 2026",
      "9ª Edição",
      "ISEP",
      "NEI-ISEP",
      "Tecnologia",
      "Empregabilidade",
      "Engenharia Informática",
      "Porto",
    ],
  },
  wallet: {
    cardTitle: "Fallstack 2026",
    // Pass background color; sampled from the hero image.
    hexBackgroundColor: "#641b04",
    // Public paths; Google fetches them, so they must resolve on the site origin.
    // Note: Google Wallet displays the logo inside a white circular avatar mask,
    // so logoPath must use dark artwork (#141414) for proper contrast.
    logoPath: "/google-wallet/logo.png",
    heroImagePath: "/google-wallet/hero.png",
  },
  storage: {
    authCookie: "@Fallstack26:auth",
    hideInstallPrompt: "@Fallstack26:hidePrompt",
  },
  hashtag: "#fallstack2026",
  repositoryUrl:
    "https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website",
};
