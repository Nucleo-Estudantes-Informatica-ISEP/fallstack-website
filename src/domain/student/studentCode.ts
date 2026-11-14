export const STUDENT_CODE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const STUDENT_CODE_LENGTH = 4;

// ADR 0022: six-character codes are accepted alongside the existing
// four-character ones. Issuing six-character codes is #514's change.
const ACCEPTED_STUDENT_CODE_LENGTHS: readonly number[] = [4, 6];

export function normalizeStudentCode(value: string) {
  return value.trim().toUpperCase();
}

export function isStudentCode(value: string) {
  const normalized = normalizeStudentCode(value);
  return (
    ACCEPTED_STUDENT_CODE_LENGTHS.includes(normalized.length) &&
    [...normalized].every((character) =>
      STUDENT_CODE_CHARACTERS.includes(character)
    )
  );
}
