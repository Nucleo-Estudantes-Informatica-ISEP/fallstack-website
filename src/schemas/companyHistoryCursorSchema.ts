import { z } from "zod";

export const companyHistoryCursorSchema = z.object({
  studentId: z.uuid(),
});
