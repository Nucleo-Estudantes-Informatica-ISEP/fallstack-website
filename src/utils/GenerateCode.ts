import { randomInt } from "crypto";

import {
  STUDENT_CODE_CHARACTERS,
  STUDENT_CODE_LENGTH,
} from "@/domain/student/studentCode";

export default function generateRandomCode() {
  let code = "";
  for (let i = 0; i < STUDENT_CODE_LENGTH; i++) {
    code += STUDENT_CODE_CHARACTERS.charAt(
      randomInt(STUDENT_CODE_CHARACTERS.length)
    );
  }
  return code;
}
