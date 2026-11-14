import { z } from "zod";

const credential = z.string().trim().min(1).max(2048);

export const sessionCheckInSchema = z
  .object({
    token: credential.optional(),
    code: credential.optional(),
    permanentCode: credential.optional(),
    typedCode: credential.optional(),
  })
  .refine(
    (input) =>
      [input.token, input.code, input.permanentCode, input.typedCode].filter(
        (value) => value !== undefined
      ).length === 1,
    { message: "Provide exactly one student pass token or code." }
  );

export type SessionCheckInInput = z.infer<typeof sessionCheckInSchema>;
