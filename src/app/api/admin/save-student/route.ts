import { NextResponse } from "next/server";

import { httpErrorResponse } from "@/server/http/httpErrorResponse";
import { saveStudentAsAdmin } from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";
import { saveStudentAdminSchema } from "@/schemas/saveStudentAdminSchema";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = saveStudentAdminSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json(
      await saveStudentAsAdmin(
        parsed.data.studentEmailNumber,
        parsed.data.companyId
      )
    );
  } catch (error) {
    return httpErrorResponse(error);
  }
}
