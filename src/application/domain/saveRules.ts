import { HttpError } from "@/types/HttpError";

export function assertStudentCanBeSaved(
  alreadySaved: boolean,
  allowDuplicate = false
) {
  if (alreadySaved && !allowDuplicate)
    throw new HttpError("Student already saved by your company", 409);
}

export const findBoothAction = (
  companyName: string,
  actions: Readonly<Record<string, string>>
) => actions[companyName.toLowerCase()];
