import { PrismaClient } from "@prisma/client";
import { expect, test } from "vitest";

import { databaseFixtures } from "./support/databaseFixtures";

const db = new PrismaClient();

test("session deletion is restricted and scanner deletion preserves attendance", async () => {
  const fixtures = databaseFixtures(db);
  let checkInId: string | undefined;
  try {
    const student = await fixtures.student();
    const scanner = await fixtures.student();
    const session = await fixtures.schedule(1, 471);
    const checkIn = await db.sessionCheckIn.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        scannedById: scanner.id,
      },
    });
    checkInId = checkIn.id;
    await expect(
      db.scheduleEvent.delete({ where: { id: session.id } })
    ).rejects.toMatchObject({ code: "P2003" });
    await db.user.delete({ where: { id: scanner.id } });
    expect(
      (await db.sessionCheckIn.findUniqueOrThrow({ where: { id: checkIn.id } }))
        .scannedById
    ).toBeNull();
  } finally {
    if (checkInId)
      await db.sessionCheckIn.deleteMany({ where: { id: checkInId } });
    await fixtures.cleanup();
    await db.$disconnect();
  }
});
