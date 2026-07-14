import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toSavedStudentDto } from "@/application/dto/historyDto";
import { getCompanyHistoryWithInterests } from "@/application/services/savedStudentService";

export const GET = defineHandler({
  auth: "employee",
  handler: async ({ session }) => {
    const history = await getCompanyHistoryWithInterests(
      session!.employee!.company!.id
    );
    return NextResponse.json(history.map(toSavedStudentDto));
  },
});
