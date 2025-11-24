import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";

const schema = z.object({
  interests: z.array(z.string()),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({
      message: "Not authorized",
    });

  const body = await req.json();

  const safeParse = schema.safeParse(body);
  if (!safeParse.success)
    return NextResponse.json({ message: safeParse.error });

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
              set: body.interests.map((interest: string) => ({ name: interest })),
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
        set: body.interests.map((interest: string) => ({ name: interest })),
      },
    },
  });

  return NextResponse.json(user);
}
