import { z } from "zod";

const questionSchema = z.object({
  PT: z.string().min(1).max(300),
  EN: z.string().min(1).max(300),
});

const answerSchema = z.object({
  PT: z.string().min(1).max(2000),
  EN: z.string().min(1).max(2000),
});

export const createAdminFaqSchema = z.object({
  question: questionSchema,
  answer: answerSchema,
  order: z.number().int().optional(),
});

export const updateAdminFaqSchema = z
  .object({
    question: questionSchema,
    answer: answerSchema,
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
