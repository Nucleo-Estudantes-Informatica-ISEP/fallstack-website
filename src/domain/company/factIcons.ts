import { Archive, Chart, Leaf, Trophy } from "@/components/ui/Icons";

import { IconType } from "react-icons";

// Fixed icon-name -> component lookup for CompanyProfile.facts (stored as
// JSON, so a react-icons component reference can't round-trip through it -
// see schema.prisma's CompanyProfile comment). Extend this map to offer a
// new icon in the admin facts editor.
export const FACT_ICONS: Record<string, IconType> = {
  Trophy,
  Archive,
  Leaf,
  Chart,
};

export type FactIconName = keyof typeof FACT_ICONS;

export const FACT_ICON_NAMES = Object.keys(FACT_ICONS) as FactIconName[];

export const isFactIconName = (value: string): value is FactIconName =>
  value in FACT_ICONS;
