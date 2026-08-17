// Fixed safelist for CompanyDisplayStyle.className. Tailwind generates CSS
// at build time by scanning literal class-name strings in source - an
// arbitrary class value typed into the admin form later (not present in any
// source file at build time) would have no generated CSS and silently do
// nothing. Each option here is referenced as a literal string so its CSS
// always ships, and the schema rejects anything outside this list.
export const LOGO_WIDTH_CLASSES = ["w-42", "w-3/4", "w-2/4"] as const;

export type LogoWidthClass = (typeof LOGO_WIDTH_CLASSES)[number];

export const isLogoWidthClass = (value: string): value is LogoWidthClass =>
  (LOGO_WIDTH_CLASSES as readonly string[]).includes(value);
