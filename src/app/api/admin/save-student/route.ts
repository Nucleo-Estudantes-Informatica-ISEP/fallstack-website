import { NextResponse } from "next/server";

import { httpErrorResponse } from "@/lib/http/server";
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
    await saveStudentAsAdmin(
      parsed.data.studentEmailNumber,
      parsed.data.companyId
    );
    return NextResponse.json({ message: "Student saved" });
  } catch (error) {
    return httpErrorResponse(error);
  }
}
