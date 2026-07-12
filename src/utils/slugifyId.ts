const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export default function slugifyId(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(COMBINING_DIACRITICS, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "field"
  );
}
