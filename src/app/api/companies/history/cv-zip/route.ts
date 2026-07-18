import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { createCompanyCvZip } from "@/application/services/exportService";

export const GET = defineHandler({
  auth: "employee",
  handler: async ({ session }) => {
    const zip = await createCompanyCvZip(session!.employee!.company!.id);
    return new NextResponse(zip as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="cvs-guardados.zip"',
      },
    });
  },
});
