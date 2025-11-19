import { Prisma } from "@prisma/client";

export type SavedStudentWithSavedBy = Prisma.SavedStudentGetPayload<{
  include: {
    savedBy: true;
    student: true;
  };
}>;
