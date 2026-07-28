import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the HH:MM (24h) format");

// The rest of the app (ScheduleBoard's two-lane layout, Content's
// firstDayTitle/secondDayTitle) assumes exactly two days - reject any other
// value here instead of accepting an arbitrary positive integer that would
// silently fall out of every day-keyed lookup downstream.
const daySchema = z.union([z.literal(1), z.literal(2)]);

export const createAdminScheduleSchema = z.object({
  day: daySchema,
  startTime: timeSchema,
  endTime: timeSchema,
  activity: z.string().min(1).max(300),
  order: z.number().int().optional(),
});

export const updateAdminScheduleSchema = z
  .object({
    day: daySchema,
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
      day: daySchema,
      order: z.number().int(),
      startTime: timeSchema.optional(),
      endTime: timeSchema.optional(),
    })
  ),
});
