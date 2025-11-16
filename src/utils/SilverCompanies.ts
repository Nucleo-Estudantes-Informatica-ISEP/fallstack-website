import { CompanyProps } from "../components/Companies/Company";
/*AccentureLogo,
	cegidLogo,
	glinttLogo,
	itimLogo,
	msgLogo,*/

import {
  AccentureLogo,
  cegidLogo,
  glinttLogo,
  itimLogo,
  msgLogo as msgLifeIberiaLogo,
} from "./CompaniesImages";

export const SilverCompanies: CompanyProps[] = [
  {
    logoHref: glinttLogo,
    name: "glintt",
    websiteUrl: "https://www.glintt.com/",
  },
  {
    logoHref: AccentureLogo,
    name: "accenture",
    websiteUrl: "https://www.accenture.com/",
    className: "w-3/4",
  },
  {
    logoHref: cegidLogo,
    name: "Cegid",
    websiteUrl: "https://www.cegid.com/ib/pt/",
  },
  {
    logoHref: itimLogo,
    name: "Itim",
    websiteUrl: "https://www.itim.com/",
    className: "w-2/4",
  },
  {
    logoHref: msgLifeIberiaLogo,
    name: "msg insur:it",
    websiteUrl: "https://msg-insurit.com/pt-pt/",
    className: "w-3/4",
  },
];
