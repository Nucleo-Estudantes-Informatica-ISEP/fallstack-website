import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { createCompanyCsv } from "@/application/services/exportService";

export const GET = defineHandler({
  auth: "employee",
  handler: async ({ session }) => {
    return new NextResponse(
      await createCompanyCsv(session!.employee!.company!.id),
      {
        headers: {
          "content-disposition": 'attachment; filename="fallstack.csv"',
          "content-type": "text/csv; charset=utf-8",
        },
      }
    );
  },
});
