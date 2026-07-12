import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { completeAction } from "@/lib/completeAction";
import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";
import { actionNames } from "@/edition/actions";
import { postStudentSchema } from "@/schemas/postStudentSchema";
import generateRandomCode from "@/utils/GenerateCode";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.role !== "STUDENT")
      return NextResponse.json({ error: "Invalid role." }, { status: 403 });

    if (session.student !== null)
      return NextResponse.json(
        { error: "Já tens um perfil criado." },
        { status: 403 }
      );

    // validate the request body against the schema
    const requestBody = await req.json();
    const body = postStudentSchema.parse(requestBody);

    // valid body
    const userId = session.id;
    const {
      name,
      year,
      avatar,
      bio,
      interests,
      avatarUrl: avatarUrlBody,
      cvId,
    } = body;

    // create code for student
    let code: string = "";
    let codeExists = true;

    while (codeExists) {
      code = generateRandomCode();

      const student = await prisma.student.findUnique({
        where: {
          code: code,
        },
      });

      codeExists = student !== null;
    }

    // create student
    const student = await prisma.student.create({
      data: {
        name: name,
        bio: bio?.trim(),
        code: code,
        user: {
          connect: {
            id: userId,
          },
        },
        year: year,
      },
    });

    // update interests
    await prisma.user.update({
      where: { id: userId },
      data: {
        interests: {
          connect: interests.map((interest: string) => ({ name: interest })),
        },
      },
    });

    // check if student was created
    if (!student) {
      return NextResponse.json(
        { message: "Something went wrong" },
        { status: 500 }
      );
    }

    await completeAction(code, actionNames.createProfile);

    let avatarUrl = avatarUrlBody ?? null;
    if (!avatarUrl && avatar) {
      const admin = createAdminClient();
      const supaCheck = await admin.storage
        .from("avatars")
        .createSignedUrl(`distribution/avatar/${avatar}`, 60);
      if (!supaCheck.error) {
        const { data: pub } = admin.storage
          .from("avatars")
          .getPublicUrl(`distribution/avatar/${avatar}`);
        avatarUrl = pub.publicUrl;
      } else {
        return NextResponse.json(
          { error: "Invalid avatar upload id" },
          { status: 400 }
        );
      }
    }

    let cvIdFinal: string | null = null;
    if (cvId) {
      // Supabase CV
      cvIdFinal = cvId;
      await completeAction(code, actionNames.uploadCv);
    }

    await prisma.student.update({
      data: { avatar: avatarUrl, cv: cvIdFinal },
      where: { id: student.id },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.issues }, { status: 400 });

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
