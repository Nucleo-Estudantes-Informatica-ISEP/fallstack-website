import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { changePassword } from "@/application/services/authApplicationService";
import { httpErrorResponse } from "@/server/http/httpErrorResponse";
import getServerSession from "@/application/services/sessionService";
import { changePasswordSchema } from "@/schemas/changePasswordSchema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.isAdmin)
      return NextResponse.json(
        { message: "No autorization for this operation" },
        { status: 403 }
      );
    const body = changePasswordSchema.parse(await req.json());
    await changePassword(body);
    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return httpErrorResponse(error);
  }
}
