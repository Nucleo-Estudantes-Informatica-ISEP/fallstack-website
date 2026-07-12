import { NextRequest, NextResponse } from "next/server";

import { verifyJwt } from "@/services/authService";
import {
  completeActionById,
  getActionQrCode,
  toggleActionLive,
} from "@/application/services/actionService";
import { httpErrorResponse } from "@/server/http/httpErrorResponse";
import getServerSession from "@/application/services/sessionService";

interface ActionParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: ActionParams) {
  return NextResponse.json(await getActionQrCode((await params).id));
}

export async function POST(_: NextRequest, { params }: ActionParams) {
  const session = await getServerSession();
  if (!session?.student)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const decoded = verifyJwt((await params).id, { algorithm: "HS256" }) as {
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
