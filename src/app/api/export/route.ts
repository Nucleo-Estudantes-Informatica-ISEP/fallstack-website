import { NextResponse } from "next/server";

import { createCompanyCsv } from "@/application/services/exportService";
import getServerSession from "@/application/services/sessionService";

export async function GET() {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "EMPLOYEE")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return new NextResponse(await createCompanyCsv(session.employee.company.id), {
    headers: {
      "content-disposition": 'attachment; filename="fallstack.csv"',
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
