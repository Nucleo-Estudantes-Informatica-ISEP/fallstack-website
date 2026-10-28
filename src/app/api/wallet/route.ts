import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import {
  createGoogleWalletSaveUrl,
  isGoogleWalletConfigured,
} from "@/application/services/googleWalletService";

export const GET = defineHandler({
  auth: "student",
  handler: async () =>
    NextResponse.json({ enabled: isGoogleWalletConfigured() }),
});

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
