import { NextResponse } from "next/server";

import { toSavedStudentDto } from "@/application/dto/historyDto";
import { getCompanyHistoryWithInterests } from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";

export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "EMPLOYEE" || !session.employee?.company)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const history = await getCompanyHistoryWithInterests(
    session.employee.company.id
  );
  return NextResponse.json(history.map(toSavedStudentDto));
}
