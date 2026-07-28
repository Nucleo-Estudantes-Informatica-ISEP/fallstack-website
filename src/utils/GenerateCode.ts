import { randomInt } from "crypto";

export default function generateRandomCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(randomInt(characters.length));
  }
  return code;
}
