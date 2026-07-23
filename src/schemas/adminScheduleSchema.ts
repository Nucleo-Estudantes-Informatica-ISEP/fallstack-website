import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the HH:MM (24h) format");

export const createAdminScheduleSchema = z.object({
  day: z.number().int().positive(),
  startTime: timeSchema,
  endTime: timeSchema,
  activity: z.string().min(1).max(300),
  order: z.number().int().optional(),
});

export const updateAdminScheduleSchema = z
  .object({
    day: z.number().int().positive(),
    startTime: timeSchema,
    endTime: timeSchema,
    activity: z.string().min(1).max(300),
    order: z.number().int(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

export const updateScheduleOrderSchema = z.object({
  updates: z.array(
    z.object({
      id: z.uuid(),
      day: z.number().int().positive(),
      order: z.number().int(),
    })
  ),
});
