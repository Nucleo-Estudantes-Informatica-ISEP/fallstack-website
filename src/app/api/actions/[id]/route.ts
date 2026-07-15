import { NextRequest, NextResponse } from "next/server";

import { httpErrorResponse } from "@/lib/http/server";
import { verifyJwt } from "@/services/authService";
import { toActionDto } from "@/application/dto/actionDto";
import {
  completeActionById,
  getActionQrCode,
  toggleActionLive,
} from "@/application/services/actionService";
import getServerSession from "@/application/services/sessionService";

interface ActionParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: ActionParams) {
  const data = await getActionQrCode((await params).id);
  if (!data)
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  return NextResponse.json({
    ...data,
    action: toActionDto(data.action),
  });
}

export async function POST(_: NextRequest, { params }: ActionParams) {
  const session = await getServerSession();
  if (!session?.student)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const decoded = verifyJwt((await params).id, { algorithms: ["HS256"] }) as {
    id?: string;
    timestamp?: number;
  } | null;
  if (!decoded?.id || !decoded.timestamp)
    return NextResponse.json({ error: "Erro inesperado." }, { status: 400 });
  try {
    await completeActionById(session.student.id, decoded.id);
    return NextResponse.json({ message: "Action completed" });
  } catch (error) {
    return httpErrorResponse(error);
  }
}

export async function PATCH(_: NextRequest, { params }: ActionParams) {
  const session = await getServerSession();
  if (!session?.isAdmin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await toggleActionLive((await params).id);
    return NextResponse.json({ message: "Action updated" });
  } catch (error) {
    return httpErrorResponse(error);
  }
}
