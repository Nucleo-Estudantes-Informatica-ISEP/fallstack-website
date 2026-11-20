// @vitest-environment node
import JSZip from "jszip";
import { beforeEach, expect, test, vi } from "vitest";

import { findCompanySavedStudentsWithCv } from "../repositories/savedStudentRepository";
import { createCompanyCvZip } from "./exportService";
import { getObjectStream } from "./objectStorageService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/savedStudentRepository", () => ({
  findCompanySavedStudentsWithCv: vi.fn(),
}));
vi.mock("./objectStorageService", () => ({
  cvKey: (id: string) => id,
  getObjectStream: vi.fn(),
}));

const student = {
  comment: "Fixture note",
  student: { code: "AB12", name: "Audit Student", cv: "cv-object" },
};
const signal = new AbortController().signal;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findCompanySavedStudentsWithCv).mockResolvedValue([
    student,
  ] as never);
});

test("streams only the authorized company's archive and releases admission when finished", async () => {
  const pdf = new TextEncoder().encode("%PDF fixture");
  vi.mocked(getObjectStream).mockResolvedValue({
    body: new Response(pdf).body!,
    contentLength: pdf.length,
    contentType: "application/pdf",
  });
  const zip = await createCompanyCvZip("company-one", signal);
  await expect(createCompanyCvZip("company-one", signal)).rejects.toMatchObject(
    { status: 429 }
  );

  vi.mocked(findCompanySavedStudentsWithCv).mockResolvedValue([]);
  const otherZip = await createCompanyCvZip("company-two", signal);
  await expect(
    createCompanyCvZip("company-three", signal)
  ).rejects.toMatchObject({ status: 429 });
  await new Response(otherZip).arrayBuffer();

  const archive = await JSZip.loadAsync(await new Response(zip).arrayBuffer());
  expect(await archive.file("AB12-Audit-Student.pdf")?.async("string")).toBe(
    "%PDF fixture"
  );
  expect(await archive.file("dados.csv")?.async("string")).toContain(
    "Fixture note"
  );
  expect(findCompanySavedStudentsWithCv).toHaveBeenNthCalledWith(
    1,
    "company-one",
    501
  );

  const nextZip = await createCompanyCvZip("company-one", signal);
  await new Response(nextZip).arrayBuffer();
  expect(findCompanySavedStudentsWithCv).toHaveBeenLastCalledWith(
    "company-one",
    501
  );
});

test("rejects oversized histories before reading files", async () => {
  vi.mocked(findCompanySavedStudentsWithCv).mockResolvedValue(
    Array(501).fill(student) as never
  );
  await expect(createCompanyCvZip("company-one", signal)).rejects.toMatchObject(
    { status: 413 }
  );
  expect(getObjectStream).not.toHaveBeenCalled();
});

test("closes an oversized storage stream before reading its body", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({ cancel });
  vi.mocked(getObjectStream).mockResolvedValue({
    body,
    contentLength: 65 * 1024 * 1024,
    contentType: "application/pdf",
  });
  await expect(createCompanyCvZip("company-one", signal)).rejects.toMatchObject(
    { status: 413 }
  );
  expect(cancel).toHaveBeenCalledOnce();
});
