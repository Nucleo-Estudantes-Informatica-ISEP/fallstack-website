import { Prisma } from "@prisma/client";

export type UserWithProfile = Prisma.UserGetPayload<{
  include: { employee: { include: { company: true } }; student: true };
}>;
