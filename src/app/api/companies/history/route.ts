import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";

export async function GET() {
  const session = await getServerSession();

  if (!session || session.role !== "EMPLOYEE" || !session.employee?.company)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.savedStudent.findMany({
    where: {
      savedBy: {
        companyId: session.employee.company.id,
      },
    },
    include: {
      student: {
        select: {
          name: true,
          user: {
            include: {
              interests: true,
            },
          },
          code: true,
          cv: true,
        },
      },
      savedBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!result)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  return NextResponse.json(result);
}
