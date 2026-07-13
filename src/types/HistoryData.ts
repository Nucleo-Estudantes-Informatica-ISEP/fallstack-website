import { Prisma } from "@prisma/client";

export interface HistoryData {
  createdAt: string | Date;
  studentId: string;
  comment: string | null;
  savedById?: string;
  student: Prisma.StudentGetPayload<{
    include: { user: { include: { interests: true } } };
  }>;
  savedBy: {
    name: string;
  };
}
