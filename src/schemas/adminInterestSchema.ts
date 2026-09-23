import { z } from "zod";

const nameSchema = z.object({
  PT: z.string().min(1).max(100),
  EN: z.string().min(1).max(100),
});

export const createAdminInterestSchema = z.object({
  name: nameSchema,
});

export const updateAdminInterestSchema = z.object({
  name: nameSchema,
});
