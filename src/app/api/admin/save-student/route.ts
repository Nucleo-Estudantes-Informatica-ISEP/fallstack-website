import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";
import { saveStudentAdminSchema } from "@/schemas/saveStudentAdminSchema";
import { normalizeIsepEmail } from "@/utils/isepEmail";

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session || !session.isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // validate the request body against the schema
  const requestBody = await req.json();
  const body = saveStudentAdminSchema.parse(requestBody);
  // valid body
  const { studentEmailNumber, companyId } = body;
  const studentEmail = normalizeIsepEmail(studentEmailNumber);

  // find the student
  const student = await prisma.student.findFirst({
    where: {
      user: {
        email: studentEmail,
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // find the company
  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // find an employee for the company to attribute the save to
  const employee = await prisma.employee.findFirst({
    where: {
      companyId: company.id,
    },
  });

  if (!employee) {
    return NextResponse.json(
      { error: "Company has no employees to attribute save to" },
      { status: 400 }
    );
  }

  // see if the student is already saved in the company
  let savedStudent = await prisma.savedStudent.findFirst({
    where: {
      studentId: student.id,
      savedBy: {
        companyId: company.id,
      },
    },
  });

  if (savedStudent) {
    return NextResponse.json(
      { error: "Student already saved" },
      { status: 400 }
    );
  }

  // save the student
  const savedStudentData = {
    studentId: student.id,
    employeeId: employee.id,
  };

  savedStudent = await prisma.savedStudent.create({
    data: savedStudentData,
  });

  return NextResponse.json(savedStudent);
}
