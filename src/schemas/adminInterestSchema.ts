import { z } from "zod";

export const createAdminInterestSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateAdminInterestSchema = z.object({
  name: z.string().min(1).max(100),
});
