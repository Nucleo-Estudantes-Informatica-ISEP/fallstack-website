import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { getCompanyHistoryPage } from "@/application/services/savedStudentService";
import { companyHistoryCursorSchema } from "@/schemas/companyHistoryCursorSchema";

export const GET = defineHandler({
  auth: "employee",
  handler: async ({ req, session }) => {
    const cursor = companyHistoryCursorSchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    if (!cursor.success)
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });

    const page = await getCompanyHistoryPage(
      session!.employee!.company!.id,
      cursor.data.studentId
    );
    return NextResponse.json(page);
  },
});
