import { z } from "zod";
import { Email } from "@/types/Email";

export const EmailSchema = z.string().transform((val, ctx) => {
  try {
    return Email.create(val);
  } catch (e: any) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.message });
    return z.NEVER;
  }
});
