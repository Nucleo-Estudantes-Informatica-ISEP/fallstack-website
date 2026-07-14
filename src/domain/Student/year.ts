export const STUDENT_YEAR = {
  LICENCIATURA_1: "1º Ano Licenciatura",
  LICENCIATURA_2: "2º Ano Licenciatura",
  LICENCIATURA_3: "3º Ano Licenciatura",
  MESTRADO_1: "1º Ano Mestrado",
  MESTRADO_2: "2º Ano Mestrado",
} as const;

export type StudentYear = keyof typeof STUDENT_YEAR;

export function studentYearLabel(year: StudentYear): string {
  return STUDENT_YEAR[year];
}

export function parseStudentYear(label: string): StudentYear {
  const match = (Object.keys(STUDENT_YEAR) as StudentYear[]).find(
    (key) => STUDENT_YEAR[key] === label
  );
  if (!match) throw new Error(`Invalid student year: "${label}".`);
  return match;
}
