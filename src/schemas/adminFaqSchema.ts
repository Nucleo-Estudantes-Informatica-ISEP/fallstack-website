import { z } from "zod";

export const createAdminFaqSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(2000),
  order: z.number().int().optional(),
});

export const updateAdminFaqSchema = z
  .object({
    question: z.string().min(1).max(300),
    answer: z.string().min(1).max(2000),
    order: z.number().int(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

export const updateFaqOrderSchema = z.object({
  updates: z.array(
    z.object({
      id: z.uuid(),
      order: z.number().int(),
    })
  ),
});
