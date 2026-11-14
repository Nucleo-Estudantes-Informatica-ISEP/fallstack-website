import { z } from "zod";

export const companyHistoryCursorSchema = z.object({
  studentId: z.uuid(),
  createdAt: z.iso.datetime({ precision: 3 }),
});

export type CompanyHistoryCursor = z.infer<typeof companyHistoryCursorSchema>;
