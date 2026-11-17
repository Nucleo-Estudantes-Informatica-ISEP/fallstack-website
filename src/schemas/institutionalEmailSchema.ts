import { z } from "zod";

import { isIsepEmail } from "@/utils/isepEmail";

export const institutionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine(isIsepEmail, "Insere um email institucional válido.");
