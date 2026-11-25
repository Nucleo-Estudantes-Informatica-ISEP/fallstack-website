import "server-only";

import { finished, Readable } from "node:stream";
import JSZip from "jszip";

import { HttpError } from "@/types/HttpError";
import { buildSavedStudentsCsv } from "@/lib/savedStudentComments";

import { findCompanySavedStudentsWithCv } from "../repositories/savedStudentRepository";
import { cvKey, getObjectStream } from "./objectStorageService";

const maxExportRows = 500;
const maxExportBytes = 64 * 1024 * 1024;
const maxConcurrentExports = 2;
const exportsInProgress = new Set<string>();

const exportTooLarge = () =>
  new HttpError("CV export exceeds the archive limit", 413);
const sanitizeFilename = (value: string) =>
  value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");

export async function createCompanyCvZip(
  companyId: string,
  requestSignal: AbortSignal
) {
  if (
    exportsInProgress.has(companyId) ||
    exportsInProgress.size >= maxConcurrentExports
  )
    throw new HttpError(
      "A CV export is already in progress. Retry shortly.",
      429
    );
  exportsInProgress.add(companyId);
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(60_000)]);

  try {
    const savedStudents = await findCompanySavedStudentsWithCv(
      companyId,
      maxExportRows + 1
    );
    if (savedStudents.length > maxExportRows) throw exportTooLarge();

    const zip = new JSZip();
    const csv = buildSavedStudentsCsv(savedStudents);
    let available = maxExportBytes - Buffer.byteLength(csv);
    if (available < 0) throw exportTooLarge();
    for (const { student } of savedStudents) {
      if (!student.cv) continue;
      const file = await getObjectStream("cv", cvKey(student.cv), signal);
      if (!file) continue;

      const chunks: Uint8Array[] = [];
      const reader = file.body.getReader();
      try {
        if (file.contentLength !== undefined && file.contentLength > available)
          throw exportTooLarge();
        for (;;) {
          signal.throwIfAborted();
          const chunk = await reader.read();
          if (chunk.done) break;
          available -= chunk.value.byteLength;
          if (available < 0) throw exportTooLarge();
          chunks.push(chunk.value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      zip.file(
        `${sanitizeFilename(student.code)}-${sanitizeFilename(student.name)}.pdf`,
        Buffer.concat(chunks)
      );
    }
    zip.file("dados.csv", csv);
    signal.throwIfAborted();

    const stream = zip.generateNodeStream({ streamFiles: true }) as Readable;
    const abort = () => stream.destroy(new Error("CV export interrupted"));
    signal.addEventListener("abort", abort, { once: true });
    const clean = finished(stream, () => {
      clean();
      signal.removeEventListener("abort", abort);
      exportsInProgress.delete(companyId);
    });
    return Readable.toWeb(stream, {
      strategy: { highWaterMark: 0 },
    }) as ReadableStream<Uint8Array>;
  } catch (error) {
    exportsInProgress.delete(companyId);
    throw error;
  }
}
