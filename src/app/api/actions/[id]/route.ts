import { NextRequest, NextResponse } from "next/server";

import config from "@/config";
import prisma from "@/lib/prisma";
import { signJwt, verifyJwt } from "@/services/authService";
import getServerSession from "@/services/getServerSession";

interface ActionParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, props: ActionParams) {
  const { id } = await props.params;

  // round timestamp to the nearest actionQrCodeRefreshRate seconds
  const timestamp =
    Math.round(Date.now() / config.constants.actionQrCodeRefreshRateMs) *
    config.constants.actionQrCodeRefreshRateMs;

  const action = await prisma.action.findUnique({
    where: { id },
  });

  const qrCode =
    "action-" +
    signJwt(
      { id, timestamp },
      {
        algorithm: "HS256",
        expiresIn: config.constants.actionQrCodeRefreshRateMs * 2,
      }
    );

  return NextResponse.json({ action, qrCode });
}

export async function POST(req: NextRequest, { params }: ActionParams) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.student)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: data } = await params;
  const decoded = verifyJwt(data, {
    algorithm: "HS256",
  }) as {
    id: string;
    timestamp: number;
  };

  if (!decoded)
    return NextResponse.json({ error: "Erro inesperado." }, { status: 400 });

  const { id, timestamp } = decoded;

  if (!id || !timestamp)
    return NextResponse.json({ error: "Erro inesperado." }, { status: 400 });

  const action = await prisma.action.findUnique({
    where: { id },
  });

  if (!action)
    return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });

  if (!action.isLive)
    return NextResponse.json(
      { error: "A ação não está aberta" },
      { status: 400 }
    );

  // check if timestamp is valid
  // const now = Date.now();
  // if (now - timestamp > config.constants.actionQrCodeRefreshRateMs)
  //   return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });

  const student = await prisma.student.findUnique({
    where: { id: session.student.id },
    include: {
      actionCompletions: {
        where: {
          actionId: id,
        },
      },
    },
  });

  if (!student)
    return NextResponse.json(
      { error: "Estudante não encontrado" },
      { status: 404 }
    );

  if (student.actionCompletions.length > 0)
    return NextResponse.json(
      { error: "Já completaste esta ação" },
      { status: 400 }
    );

  await prisma.actionCompletion.create({
    data: {
      studentId: session.student.id,
      actionId: id,
    },
  });

  return NextResponse.json({ message: "Action completed" });
}

export async function PATCH(request: NextRequest, props: ActionParams) {
  const { id } = await props.params;

  const action = await prisma.action.findUnique({
    where: { id },
  });

  if (!action)
    return NextResponse.json({ error: "Action not found" }, { status: 404 });

  await prisma.action.update({
    where: { id },
    data: {
      isLive: !action.isLive,
    },
  });

  return NextResponse.json({ message: "Action updated" });
}
