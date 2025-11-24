import { Prisma } from "@prisma/client";

export type SavedStudentWithSavedBy = Prisma.SavedStudentGetPayload<{
  include: {
    savedBy: {
      include: {
        company: true;
      };
    };
    student: true;
  };
}>;
