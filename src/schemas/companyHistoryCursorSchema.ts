import { z } from "zod";

export const companyHistoryCursorSchema = z.object({
  studentId: z.guid(),
  createdAt: z.iso.datetime({ precision: 3 }),
});
