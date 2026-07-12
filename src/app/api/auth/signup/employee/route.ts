import { NextResponse } from "next/server";
import { ZodError } from "zod";
import prisma from "@/lib/prisma";
import { employeeSignUpSchema } from "@/schemas/employeeSignUpSchema";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const requestBody = await req.json();
    const body = employeeSignUpSchema.parse(requestBody);

    const { email, password, name, linkedin, companyCode } = body;

    // Find company by 8-digit code
    const company = await prisma.company.findUnique({
      where: { code: companyCode },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Invalid company code" },
        { status: 404 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error || !data.user) {
      return NextResponse.json(
        { message: error?.message || "Unable to sign up" },
        { status: 400 }
      );
    }

    // Create session if not present (for local dev convenience)
    if (!data.session) {
      await supabase.auth.signInWithPassword({ email, password });
    }

    const supabaseUser = data.user;

    // Create application user with EMPLOYEE role if not existing
    try {
      await prisma.user.create({
        data: {
          id: supabaseUser.id,
          email,
          role: "EMPLOYEE",
        },
      });
    } catch (_) {
      // ignore if user already exists
    }

    // Create Employee profile linked to company
    await prisma.employee.create({
      data: {
        id: supabaseUser.id,
        name,
        linkedin, // already undefined if blank
        companyId: company.id,
      },
    });

    return NextResponse.json(
      { message: "Employee signup successfully" },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof ZodError) {
      //@ts-ignore
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
