import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { createCompanyCvZip } from "@/application/services/exportService";

export const GET = defineHandler({
  auth: "employee",
  handler: async ({ req, session }) => {
    const zip = await createCompanyCvZip(
      session!.employee!.company!.id,
      req.signal
    );
    return new NextResponse(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="cvs-guardados.zip"',
        "Cache-Control": "private, no-store",
      },
    });
  },
});
