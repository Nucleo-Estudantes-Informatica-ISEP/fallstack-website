export const STUDENT_CODE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const STUDENT_CODE_LENGTH = 4;

export function normalizeStudentCode(value: string) {
  return value.trim().toUpperCase();
}

export function isStudentCode(value: string) {
  const normalized = normalizeStudentCode(value);
  return (
    normalized.length === STUDENT_CODE_LENGTH &&
    [...normalized].every((character) =>
      STUDENT_CODE_CHARACTERS.includes(character)
    )
  );
}
