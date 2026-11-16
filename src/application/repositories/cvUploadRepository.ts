import "server-only";

import { HttpError } from "@/types/HttpError";

import prisma, { type DbClient } from "./database";

export const createCvUpload = (data: {
  id: string;
  ownerId: string;
  size: number;
  expiresAt: Date;
  multipartId?: string;
}) => prisma.cvUpload.create({ data });

export const findCvUpload = (
  id: string,
  ownerId: string,
  db: DbClient = prisma
) => db.cvUpload.findFirst({ where: { id, ownerId } });

export async function claimCvUpload(
  id: string,
  ownerId: string,
  attemptId: string,
  now: Date
) {
  return (
    (
      await prisma.cvUpload.updateMany({
        where: {
          id,
          ownerId,
          expiresAt: { gt: now },
          OR: [
            { status: "pending" },
            { status: "validating", leaseUntil: { lt: now } },
          ],
        },
        data: {
          status: "validating",
          attemptId,
          leaseUntil: new Date(now.getTime() + 90_000),
        },
      })
    ).count === 1
  );
}

export const finishCvValidation = async (
  id: string,
  ownerId: string,
  attemptId: string,
  cvId: string,
  db: DbClient
) => {
  if (
    (
      await db.cvUpload.updateMany({
        where: { id, ownerId, status: "validating", attemptId },
        data: { status: "ready", cvId, leaseUntil: null },
      })
    ).count !== 1
  )
    throw new HttpError("Upload finalization superseded", 409);
};

export const releaseCvUpload = (
  id: string,
  attemptId: string,
  rejected: boolean
) =>
  prisma.cvUpload.updateMany({
    where: { id, status: "validating", attemptId },
    data: {
      status: rejected ? "rejected" : "pending",
      leaseUntil: null,
      attemptId: null,
    },
  });

export const cancelPendingCvUpload = (id: string, ownerId: string) =>
  prisma.cvUpload.updateMany({
    where: { id, ownerId, status: "pending" },
    data: { status: "cancelled" },
  });

/** Same transaction as association. Replays cannot restore superseded CVs. */
export async function consumeCvUpload(
  ownerId: string,
  cvId: string,
  db: DbClient
) {
  const ticket = await db.cvUpload.findFirst({ where: { cvId, ownerId } });
  if (!ticket || !["ready", "attached"].includes(ticket.status))
    throw new HttpError("Invalid CV upload id", 400);

  if (typeof db.$queryRaw === "function") {
    await db.$queryRaw`SELECT id FROM "Student" WHERE id = ${ownerId}::uuid FOR UPDATE`;
  }
  const student =
    typeof db.student?.findUnique === "function"
      ? await db.student.findUnique({
          where: { id: ownerId },
          select: { cv: true },
        })
      : null;

  if (ticket.status === "attached") {
    if (student?.cv !== cvId)
      throw new HttpError("CV upload already consumed", 409);
    return false;
  }
  if (ticket.createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000)
    throw new HttpError("CV upload expired", 410);

  if (student?.cv) {
    if (student.cv === cvId) return false;
    const currentTicket = await db.cvUpload.findFirst({
      where: { cvId: student.cv, ownerId },
      select: { id: true, createdAt: true, seq: true },
    });
    if (
      currentTicket &&
      (currentTicket.createdAt > ticket.createdAt ||
        (currentTicket.createdAt.getTime() === ticket.createdAt.getTime() &&
          currentTicket.seq > ticket.seq))
    ) {
      throw new HttpError("CV upload superseded", 409);
    }
  }

  if (
    (
      await db.cvUpload.updateMany({
        where: { id: ticket.id, status: "ready" },
        data: { status: "attached" },
      })
    ).count !== 1
  )
    throw new HttpError("CV upload already consumed", 409);
  return true;
}
