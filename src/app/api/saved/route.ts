import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import config from "@/config";
import { completeAction } from "@/lib/completeAction";
import { reportError } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { isSaved } from "@/lib/savedStudents";
import { errorResponse } from "@/services/apiResponse";
import { verifyJwt } from "@/services/authService";
import getServerSession from "@/services/getServerSession";
import { saveSchema } from "@/schemas/saveSchema";

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const safeParse = saveSchema.safeParse(body);
  if (!safeParse.success)
    return NextResponse.json({ message: safeParse.error }, { status: 400 });

  const { token } = safeParse.data;

  let studentCode = token;
  if (token) {
    const decoded = verifyJwt(token) as unknown as { code: string } | null;
    if (!decoded)
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    else studentCode = decoded.code;
  }

  // check if student exists
  const student = await prisma.student.findUnique({
    where: { code: studentCode },
    include: { user: true },
  });

  if (!student)
    return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // require company context for scans/saves
  if (!session.employee || !session.employee.company)
    return NextResponse.json({ error: "Company not found" }, { status: 404 });

  // check if student is already saved by this company
  const alreadySaved = await isSaved(session.employee.company.id, studentCode);

  if (alreadySaved && !session.isAdmin)
    return NextResponse.json(
      { error: "Student already saved by your company" },
      { status: 409 }
    );

  // create history
  const entry = await prisma.savedStudent.create({
    data: {
      studentId: student.id,
      employeeId: session.employee.id,
    },
  });

  if (!entry)
    return NextResponse.json(
      { error: "Error creating history" },
      { status: 500 }
    );

  const company = await prisma.company.findUnique({
    where: { id: session.employee.company.id },
    select: { name: true },
  });

  if (!company)
    return NextResponse.json({ error: "Company not found" }, { status: 404 });

  switch (company.name) {
    case "akapeople":
    case "AkaPeople":
      await completeAction(
        student.code,
        config.constants.actionNames.akaPeopleBooth
      );
      break;
    case "natixis":
      await completeAction(
        student.code,
        config.constants.actionNames.natixisBooth
      );
      break;
    case "apr":
      await completeAction(student.code, config.constants.actionNames.aprBooth);
      break;
    case "hitachi solutions":
      await completeAction(
        student.code,
        config.constants.actionNames.hitachiBooth
      );
      break;
    case "convatec":
      await completeAction(
        student.code,
        config.constants.actionNames.convatecBooth
      );
      break;
    case "niw":
      await completeAction(student.code, config.constants.actionNames.niwBooth);
      break;
    case "deloitte":
      await completeAction(
        student.code,
        config.constants.actionNames.deloitteBooth
      );
      break;
    case "accenture":
      await completeAction(
        student.code,
        config.constants.actionNames.accentureBooth
      );
      break;
    case "armis":
      await completeAction(
        student.code,
        config.constants.actionNames.armisBooth
      );
      break;
    case "devscope":
      await completeAction(
        student.code,
        config.constants.actionNames.devscopeBooth
      );
      break;
    case "insur:it msg":
      await completeAction(
        student.code,
        config.constants.actionNames.msgInsurItBooth
      );
      break;
    case "glintt":
      await completeAction(
        student.code,
        config.constants.actionNames.glinttBooth
      );
      break;
    case "konkconsulting":
      await completeAction(
        student.code,
        config.constants.actionNames.konkConsultingBooth
      );
      break;
  }

  return NextResponse.json({ message: "Student scanned" }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();

  const body = await req.json();

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role !== "EMPLOYEE" || !session.employee)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error, 400);

  const { token } = parsed.data;

  let studentCode = token as string;
  if (token) {
    const decoded = verifyJwt(token) as unknown as { code: string };
    studentCode = decoded.code;
  }

  const alreadySaved = await isSaved(session.employee.company.id, studentCode);

  if (alreadySaved)
    return NextResponse.json({ error: "Already saved" }, { status: 409 });

  const student = await prisma.student.findUnique({
    where: { code: studentCode },
  });

  if (!student)
    return NextResponse.json({ error: "Invalid student" }, { status: 400 });

  try {
    const result = await prisma.savedStudent.create({
      data: {
        employeeId: session.employee.id,
        studentId: student.id,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // P2002 is the Prisma error code for unique constraint violation
      return NextResponse.json(
        { error: "Student already saved" },
        { status: 400 }
      );
    }

    reportError(
      error,
      { operation: "save_student", route: "/api/saved", method: "PATCH" },
      "Failed to save student"
    );
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
