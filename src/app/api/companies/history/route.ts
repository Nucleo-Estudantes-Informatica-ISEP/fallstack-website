import { NextResponse } from "next/server";

import { getCompanyHistoryWithInterests } from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";

export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "EMPLOYEE" || !session.employee?.company)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    await getCompanyHistoryWithInterests(session.employee.company.id)
  );
}
