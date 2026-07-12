import { NextRequest, NextResponse } from "next/server";

import config from "@/config";
import { completeAction } from "@/lib/completeAction";
import prisma from "@/lib/prisma";
import { isSaved } from "@/lib/savedStudents";
import getServerSession from "@/services/getServerSession";
import { patchStudentSchema } from "@/schemas/patchStudentSchema";

interface StudentProps {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(req: NextRequest, props: StudentProps) {
  const { code } = await props.params;

  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { code },
    include: {
      user: {
        include: {
          interests: true,
        },
      },
    },
  });

  if (!student)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the owner, a company that saved this student, or an admin.
  // Unauthorized -> 404 (don't reveal the student exists).
  const isOwner = session.student?.code === code;
  const isSavingCompany =
    !!session.employee?.company &&
    (await isSaved(session.employee.company.id, code));

  if (!isOwner && !isSavingCompany && !session.isAdmin)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(student);
}

export async function PATCH(req: NextRequest, props: StudentProps) {
  const params = await props.params;
  const session = await getServerSession();
  const { code } = params;

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.student || session.student.code !== code)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requestBody = await req.json();

  const safeParse = patchStudentSchema.safeParse(requestBody);
  if (!safeParse.success)
    return NextResponse.json({ message: safeParse.error });

  const body = safeParse.data;
  const student = await prisma.student.update({
    where: { code },
    data: {
      bio: body.bio?.trim(),
      linkedin: body.linkedin,
      github: body.github,
    },
  });

  if (student.linkedin) {
    await completeAction(
      student.code,
      config.constants.actionNames.updateLinkedin
    );
  }

  if (body.interests) {
    await prisma.user.update({
      where: { id: session.id },
      data: {
        interests: {
          set: body.interests.map((interest) => ({ name: interest })),
        },
      },
    });
  }

  return NextResponse.json(student);
}
