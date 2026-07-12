import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { httpErrorResponse } from "@/lib/http/server";
import { signUpEmployee } from "@/application/services/authApplicationService";
import { employeeSignUpSchema } from "@/schemas/employeeSignUpSchema";

export async function POST(req: Request) {
  try {
    const body = employeeSignUpSchema.parse(await req.json());
    await signUpEmployee(body);
    return NextResponse.json(
      { message: "Employee signup successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return httpErrorResponse(error);
  }
}
