import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { reportError } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { errorResponse } from "@/services/apiResponse";
import getServerSession from "@/services/getServerSession";

const schema = z.object({
  interests: z.array(z.string()),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return errorResponse("Unauthorized", 401);

  const body = await req.json();

  const safeParse = schema.safeParse(body);
  if (!safeParse.success) return errorResponse(safeParse.error, 400);

  // If employee, update interests for ALL employees in the company
  if (session.employee) {
    const employees = await prisma.employee.findMany({
      where: { companyId: session.employee.companyId },
      include: { user: true },
    });

    // Update interests for all employees in the company
    try {
      await prisma.$transaction(
        employees.map((employee) =>
          prisma.user.update({
            where: { id: employee.user.id },
            data: {
              interests: {
                set: body.interests.map((interest: string) => ({
                  name: interest,
                })),
              },
            },
          })
        )
      );
    } catch (error) {
      reportError(
        error,
        {
          operation: "update_company_interests",
          route: "/api/user",
          method: "PATCH",
        },
        "Failed to update company interests"
      );
      return NextResponse.json(
        { error: "Error updating interests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  // For students, update only their own interests
  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      interests: {
        set: body.interests.map((interest: string) => ({ name: interest })),
      },
    },
  });

  return NextResponse.json(user);
}
