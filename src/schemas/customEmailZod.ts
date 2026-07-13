import { z } from "zod";

import { Email } from "@/types/Email";

export const EmailSchema = z.string().transform((val, ctx) => {
  try {
    return Email.create(val);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid email";
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    return z.NEVER;
  }
});
