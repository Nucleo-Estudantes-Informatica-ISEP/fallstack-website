import { z } from "zod";

import { EmailSchema } from "@/schemas/customEmailZod";

export const requestResetSchema = z.object({
  email: EmailSchema,
});
