import { actions } from "./actions";
import { branding } from "./branding";
import { BronzeCompanies } from "./BronzeCompanies";
import { DiamondCompanies } from "./DiamondCompanies";
import { FAQ } from "./FAQ";
import { GoldCompanies } from "./GoldCompanies";
import { ScheduleDays } from "./ScheduleDays";
import { SilverCompanies } from "./SilverCompanies";
import { Sponsors } from "./Sponsors";

export { default as findEditionContentByName } from "./CompanyByName";

export const edition = {
  branding,
  sponsors: Sponsors,
  tiers: {
    diamond: DiamondCompanies,
    gold: GoldCompanies,
    silver: SilverCompanies,
    bronze: BronzeCompanies,
  },
  actions,
  schedule: ScheduleDays,
  faq: FAQ,
};
