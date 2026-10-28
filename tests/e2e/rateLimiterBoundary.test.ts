// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";

import { putObject } from "@/application/services/objectStorageService";
import getServerSession from "@/application/services/sessionService";

import { POST } from "../../src/app/api/storage/cv/route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/objectStorageService", () => ({
  cvKey: (id: string) => `distribution/cv/${id}.pdf`,
  putObject: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

test("CV route allows five uploads on each side of a window reset", async () => {
  let now = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);

  const students = Array.from({ length: 6 }, (_, index) => ({
    id: `boundary-student-${index}`,
    role: "STUDENT" as const,
    student: null,
    employee: null,
    adminRole: null,
  }));
  const send = async (student: (typeof students)[number]) => {
    vi.mocked(getServerSession).mockResolvedValue(
      student as Awaited<ReturnType<typeof getServerSession>>
    );
    const form = new FormData();
    form.append(
      "file",
      new File(["%PDF-1.4\n%%EOF\n"], "event-readiness.pdf", {
        type: "application/pdf",
      })
    );
    return POST(
      new NextRequest("http://localhost/api/storage/cv", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({}) }
    );
  };

  for (const student of students)
    expect((await send(student)).status).toBe(201);

  now += 59_800;
  for (const student of students) {
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await send(student)).status);
    expect(statuses).toEqual([201, 201, 201, 201]);
  }

  now += 210;
  for (const student of students) {
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await send(student)).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201]);
    const beyondAllowance = await send(student);
    expect(beyondAllowance.status).toBe(429);
    expect(await beyondAllowance.json()).toEqual({
      error: "Too many requests",
    });
  }
  expect(putObject).toHaveBeenCalledTimes(60);
});
