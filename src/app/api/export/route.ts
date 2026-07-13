import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { BASE_URL } from "@/services/api";
import { signJwt } from "@/services/authService";
import getServerSession from "@/services/getServerSession";

function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getServerSession();

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role !== "EMPLOYEE" || !session.employee?.company)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const saves = await prisma.savedStudent.findMany({
    where: { savedBy: { companyId: session.employee.company.id } },
    include: {
      student: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const data: string[] = [];
  data.push("Nome,Email,Linkedin,Github,CV,Data guardado,");

  // NOTE: token intentionally non-expiring for now — CV access/retention model
  // is an open decision (see fallstack-decisions.md, DEC-1). Revisit the TTL there.
  const token = signJwt({ id: session.employee.company.id });

  saves.forEach((s) => {
    const cvUrl = `${BASE_URL}/export/${s.student.code}/cv?token=${token}`;
    const formatted = new Date(s.createdAt)
      .toLocaleString("pt-PT")
      .replace(",", "");

    data.push(
      [
        s.student.name,
        s.student.user.email,
        s.student.linkedin || "",
        s.student.github || "",
        cvUrl,
        formatted,
      ]
        .map(csvCell)
        .join(",")
    );
  });

  // ! the link may not return a cv if the user does not have one

  return new NextResponse(data.join("\n"), {
    headers: {
      "content-disposition": `attachment; filename="fallstack.csv"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
