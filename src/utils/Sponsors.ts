import { SponsorProps } from "@/components/Sponsor";

import {
  aeisepLogo,
  bocaDoceLogo,
  deiLogo,
  divinalLogo,
  dominosLogo,
  melhorCroissantLogo,
} from "./CompaniesImages";

export const Sponsors: SponsorProps[] = [
  {
    name: "Confeitaria Divinal logo",
    logoHref: divinalLogo,
    website: "https://www.facebook.com/divinal.porto/?locale=pt_PT",
  },
  {
    name: "AEISEP Logo",
    logoHref: aeisepLogo,
    website: "https://www.aeisep.pt/",
  },
  {
    name: "DEI ISEP Logo",
    logoHref: deiLogo,
    website: "https://dei.isep.ipp.pt/",
  },
  {
    name: "Melhor Croissant da minha rua Logo",
    logoHref: melhorCroissantLogo,
    website: "https://omelhorcroissantdaminharua.com/",
  },
  {
    name: "Dominos Logo",
    logoHref: dominosLogo,
    website: "https://dominos.pt/",
  },
  {
    name: "Boca Doce Logo",
    logoHref: bocaDoceLogo,
    website: "https://www.facebook.com/bemmequergrupobocadoce/",
  },
];
