import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { httpErrorResponse } from "@/lib/http/server";
import { signUpUser } from "@/application/services/authApplicationService";
import { signUpSchema } from "@/schemas/signUpSchema";

export async function POST(req: Request) {
  try {
    const body = signUpSchema.parse(await req.json());
    await signUpUser({
      email: body.email,
      password: body.password,
      role: "STUDENT",
    });
    return NextResponse.json(
      { message: "Signup successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return httpErrorResponse(error);
  }
}
