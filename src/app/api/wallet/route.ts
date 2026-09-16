import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { createGoogleWalletSaveUrl } from "@/application/services/googleWalletService";

export const POST = defineHandler({
  auth: "student",
  handler: async ({ session }) => {
    const student = session!.student!;
    const url = await createGoogleWalletSaveUrl({
      id: student.id,
      code: student.code,
      name: student.name,
    });

    return NextResponse.json({ url }, { status: 200 });
  },
});
