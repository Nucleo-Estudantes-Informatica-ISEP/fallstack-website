import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ZodError } from "zod";

import prisma from "@/lib/prisma";
import { changePasswordSchema } from "@/schemas/changePasswordSchema";
import getServerSession from "@/services/getServerSession";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        {message: "No autorization for this operation"}, 
        {status: 403}
      );
    }

    // validate the request body against the schema
    const requestBody = await req.json();
    const body = changePasswordSchema.parse(requestBody);
    // valid body
    const { email, password, confirmPassword } = body;

    // find prisma user by email to get Supabase user id
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      return NextResponse.json(
        { message: "That email is not registered" },
        { status: 401 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords are not equal"},
        { status: 400}
      );
    }
    
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
    });
    if (error)
      return NextResponse.json({ message: error.message }, { status: 400 });

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.issues }, { status: 400 });

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
