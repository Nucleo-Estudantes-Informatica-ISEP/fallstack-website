import { NextResponse } from "next/server";
import { ZodError } from "zod";

import config from "@/config";
import { completeAction } from "@/lib/completeAction";
import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";
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
    }

    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          name,
          bio: bio?.trim(),
          code,
          user: { connect: { id: userId } },
          year,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          interests: {
            connect: interests.map((interest: string) => ({ name: interest })),
          },
        },
      });

      await completeAction(
        code,
        config.constants.actionNames.createProfile,
        tx
      );

      if (cvIdFinal) {
        await completeAction(code, config.constants.actionNames.uploadCv, tx);
      }

      return tx.student.update({
        data: { avatar: avatarUrl, cv: cvIdFinal },
        where: { id: createdStudent.id },
      });
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
