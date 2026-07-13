import { HttpError } from "@/types/HttpError";

export function assertStudentCanBeSaved(
  alreadySaved: boolean,
  allowDuplicate = false
) {
  if (alreadySaved && !allowDuplicate)
    throw new HttpError("Student already saved by your company", 409);
}
