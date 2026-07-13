import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { verifyJwt } from "@/services/authService";
import { toActionDto } from "@/application/dto/actionDto";
import {
  completeActionById,
  getActionQrCode,
  toggleActionLive,
} from "@/application/services/actionService";

interface ActionParams {
  id: string;
}

export const GET = defineHandler<ActionParams>({
  auth: "public",
  handler: async ({ params }) => {
    const data = await getActionQrCode(params.id);
    return NextResponse.json({
      ...data,
      action: data.action ? toActionDto(data.action) : null,
    });
  },
});

export const POST = defineHandler<ActionParams>({
  auth: "student",
  handler: async ({ session, params }) => {
    const decoded = verifyJwt(params.id, { algorithms: ["HS256"] }) as {
      id?: string;
      timestamp?: number;
    } | null;
    if (!decoded?.id || !decoded.timestamp)
      return NextResponse.json({ error: "Erro inesperado." }, { status: 400 });
    await completeActionById(session!.student!.id, decoded.id);
    return NextResponse.json({ message: "Action completed" });
  },
});

export const PATCH = defineHandler<ActionParams>({
  auth: "admin",
  handler: async ({ params }) => {
    await toggleActionLive(params.id);
    return NextResponse.json({ message: "Action updated" });
  },
});
