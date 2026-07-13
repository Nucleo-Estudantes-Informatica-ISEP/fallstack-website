import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { reportError } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { employeeSignUpSchema } from "@/schemas/employeeSignUpSchema";
import { createAdminClient } from "@/utils/supabase/admin";
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

    try {
      await prisma.$transaction(async (tx) => {
        // Create application user with EMPLOYEE role if not existing
        await tx.user.upsert({
          where: { id: supabaseUser.id },
          update: {},
          create: {
            id: supabaseUser.id,
            email,
            role: "EMPLOYEE",
          },
        });
        // Create Employee profile linked to company
        await tx.employee.create({
          data: {
            id: supabaseUser.id,
            name,
            linkedin, // already undefined if blank
            companyId: company.id,
          },
        });
      });
    } catch (transactionError) {
      try {
        const admin = createAdminClient();
        const { error: cleanupError } = await admin.auth.admin.deleteUser(
          supabaseUser.id
        );
        if (cleanupError) {
          reportError(
            cleanupError,
            { operation: "rollback_employee_auth_signup" },
            "Failed to roll back employee auth signup"
          );
        }
      } catch (cleanupError) {
        reportError(
          cleanupError,
          { operation: "rollback_employee_auth_signup" },
          "Failed to roll back employee auth signup"
        );
      }

      reportError(
        transactionError,
        {
          operation: "create_employee_profile",
          route: "/api/auth/signup/employee",
          method: "POST",
        },
        "Failed to create employee profile"
      );
      return NextResponse.json(
        { error: "Unable to create employee profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Employee signup successfully" },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
