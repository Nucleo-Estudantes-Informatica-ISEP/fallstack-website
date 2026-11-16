import { HttpError } from "@/types/HttpError";

export const CV_PART_BYTES = 5 * 1024 * 1024;

export function cvPartSize(size: number, partNumber: number) {
  if (
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > Math.ceil(size / CV_PART_BYTES)
  )
    throw new HttpError("Invalid upload part", 400);
  return Math.min(CV_PART_BYTES, size - (partNumber - 1) * CV_PART_BYTES);
}
