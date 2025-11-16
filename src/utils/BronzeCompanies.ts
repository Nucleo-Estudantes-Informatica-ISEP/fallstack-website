import { CompanyProps } from "../components/Companies/Company";
/*euronextLogo,
	liderteamLogo,*/

import {
  euronextLogo,
  liderteamLogo
} from "./CompaniesImages";

export const BronzeCompanies: CompanyProps[] = [
  {
    logoHref: euronextLogo,
    name: "Euronext",
    websiteUrl: "https://www.euronext.com/",
  },
  {
    logoHref: liderteamLogo,
    name: "Liderteam",
    websiteUrl: "https://www.liderteam.pt/",
    className: "w-3/4",
  }
];
