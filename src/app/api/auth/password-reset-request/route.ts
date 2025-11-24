import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email)
      return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return NextResponse.json({
        message: "If that account exists, an email was sent",
      });

    const token = crypto.randomBytes(24).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        token,
        user: { connect: { id: user.id } },
      },
    });

    // NOTE: In production you should email the token (link) to the user.
    // For development we return the token in the response so it can be used immediately.
    return NextResponse.json({ message: "OK", token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
