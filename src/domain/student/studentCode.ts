const STUDENT_CODE_PATTERN = /^[A-Z0-9]{4}$/;

export function normalizeStudentCode(value: string) {
  return value.trim().toUpperCase();
}

export function isStudentCode(value: string) {
  return STUDENT_CODE_PATTERN.test(normalizeStudentCode(value));
}
