import { NextResponse } from "next/server";

import { httpErrorResponse } from "@/lib/http/server";
import { createCompanyCvZip } from "@/application/services/exportService";
import getServerSession from "@/application/services/sessionService";

export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "EMPLOYEE" || !session.employee?.company)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const zip = await createCompanyCvZip(session.employee.company.id);
    return new NextResponse(zip as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="cvs-guardados.zip"',
      },
    });
  } catch (error) {
    return httpErrorResponse(error);
  }
}
