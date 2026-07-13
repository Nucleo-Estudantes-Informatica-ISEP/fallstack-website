import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { errorResponse } from "@/services/apiResponse";
import getServerSession from "@/services/getServerSession";
import { userInterestsSchema } from "@/schemas/userInterestsSchema";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return errorResponse("Unauthorized", 401);

  const body = await req.json();

  const safeParse = userInterestsSchema.safeParse(body);
  if (!safeParse.success) return errorResponse(safeParse.error, 400);

  const { interests } = safeParse.data;

  // If employee, update interests for ALL employees in the company
  if (session.employee) {
    const employees = await prisma.employee.findMany({
      where: { companyId: session.employee.companyId },
      include: { user: true },
    });

    // Update interests for all employees in the company
    await Promise.all(
      employees.map((employee) =>
        prisma.user.update({
          where: { id: employee.user.id },
          data: {
            interests: {
              set: interests.map((interest) => ({ name: interest })),
            },
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  }

  // For students, update only their own interests
  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      interests: {
        set: interests.map((interest) => ({ name: interest })),
      },
    },
  });

  return NextResponse.json(user);
}
