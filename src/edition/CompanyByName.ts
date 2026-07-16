import { BronzeCompanies } from "./BronzeCompanies";
import { CompanyEditionContent } from "./CompanyEditionContent";
import { DiamondCompanies } from "./DiamondCompanies";
import { GoldCompanies } from "./GoldCompanies";
import { SilverCompanies } from "./SilverCompanies";

const ALL_COMPANY_CONTENT: CompanyEditionContent[] = [
  ...DiamondCompanies,
  ...GoldCompanies,
  ...SilverCompanies,
  ...BronzeCompanies,
];

export default function findEditionContentByName(
  name: string
): CompanyEditionContent | null {
  const normalized = name.replaceAll("%20", " ").toLowerCase();
  return (
    ALL_COMPANY_CONTENT.find(
      (company) => company.name.toLowerCase() === normalized
    ) ?? null
  );
}
