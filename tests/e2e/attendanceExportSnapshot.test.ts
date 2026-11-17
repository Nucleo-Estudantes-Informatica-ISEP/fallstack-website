// @vitest-environment node
import { PrismaClient } from "@prisma/client";
import { expect, test, vi } from "vitest";

import { databaseFixtures } from "./support/databaseFixtures";

vi.mock("server-only", () => ({}));

const db = new PrismaClient();

test("exports the captured session after schedule edits and scanner deletion", async () => {
  const fixtures = databaseFixtures(db);
  let checkInId: string | undefined;
  try {
    const student = await fixtures.student();
    const scanner = await fixtures.student();
    const session = await fixtures.schedule(1, 4711);
    const checkIn = await db.sessionCheckIn.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        scannedById: scanner.id,
        // A caller cannot override the database-owned snapshot.
        sessionDay: 999,
      },
    });
    checkInId = checkIn.id;
    await db.scheduleEvent.update({
      where: { id: session.id },
      data: {
        day: 4712,
        startTime: "12:00",
        endTime: "13:00",
        activity: { PT: "Renamed", EN: "Renamed" },
      },
    });
    await db.user.delete({ where: { id: scanner.id } });
    const replacementSession = await fixtures.schedule(2, 4713);
    await expect(
      db.sessionCheckIn.update({
        where: { id: checkIn.id },
        data: { sessionId: replacementSession.id },
      })
    ).rejects.toThrow("sessionId is immutable");
    await db.sessionCheckIn.update({
      where: { id: checkIn.id },
      data: { sessionDay: 999, sessionActivity: { PT: "Override" } },
    });
    const rows = await db.sessionCheckIn.findMany({
      where: { sessionDay: 4711 },
      select: {
        checkedInAt: true,
        student: { select: { name: true, user: { select: { email: true } } } },
        sessionDay: true,
        sessionStartTime: true,
        sessionEndTime: true,
        sessionActivity: true,
      },
    });
    expect(
      rows.filter((row) => row.student.name === student.name)
    ).toContainEqual({
      checkedInAt: checkIn.checkedInAt,
      student: {
        name: student.name,
        user: { email: `${student.id}@example.test` },
      },
      sessionDay: 4711,
      sessionStartTime: "09:00",
      sessionEndTime: "10:00",
      sessionActivity: { PT: "Teste", EN: "Test" },
    });
    expect(
      await db.sessionCheckIn.findMany({ where: { sessionDay: 4712 } })
    ).toEqual([]);
    await expect(
      db.scheduleEvent.delete({ where: { id: session.id } })
    ).rejects.toMatchObject({ code: "P2003" });
    await db.user.delete({ where: { id: student.id } });
    expect(
      await db.sessionCheckIn.findUnique({ where: { id: checkIn.id } })
    ).toBeNull();
  } finally {
    if (checkInId)
      await db.sessionCheckIn.deleteMany({ where: { id: checkInId } });
    await fixtures.cleanup();
    await db.$disconnect();
  }
});
