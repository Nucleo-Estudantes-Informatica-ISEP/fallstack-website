import "server-only";

import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import busboy from "busboy";

import { HttpError } from "@/types/HttpError";

export type TemporaryUpload = {
  path: string;
  size: number;
  type: string;
  header: Uint8Array;
};

// Bounds the entire request, including storage PUT. Local files are staging
// only: a completed upload always lives in shared object storage.
const UPLOAD_TIMEOUT_MS = 60_000;
const MULTIPART_OVERHEAD = 16 * 1024;

export async function withMultipartFile<T>(
  request: Request,
  maxSize: number,
  consume: (file: TemporaryUpload, signal: AbortSignal) => Promise<T>
): Promise<T> {
  const maxBodySize = maxSize + MULTIPART_OVERHEAD;
  const declared = request.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/.test(declared) || Number(declared) > maxBodySize)
  )
    throw new HttpError("File too large", 413);
  if (!request.body || request.bodyUsed || request.body.locked)
    throw new HttpError("Missing file", 400);

  let parser: ReturnType<typeof busboy>;
  try {
    parser = busboy({
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      limits: { files: 1, fields: 0, parts: 2, fileSize: maxSize + 1 },
    });
  } catch {
    throw new HttpError("Invalid multipart upload", 400);
  }

  const directory = await mkdtemp(join(tmpdir(), "fallstack-upload-"));
  const controller = new AbortController();
  const deadline = AbortSignal.timeout(UPLOAD_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, deadline, controller.signal]);
  let failure: unknown;
  const fail = (error: unknown) => {
    failure ??= error;
    controller.abort(error);
  };
  let file: TemporaryUpload | undefined;
  let writing: Promise<void> | undefined;
  let bytesRead = 0;

  parser.on("file", (name, stream, info) => {
    if (name !== "file") {
      stream.resume();
      fail(new HttpError("Expected a single file field", 400));
      return;
    }
    const upload = {
      path: join(directory, "file"),
      size: 0,
      type: info.mimeType,
      header: Buffer.alloc(16),
    };
    file = upload;
    stream.on("limit", () => fail(new HttpError("File too large", 400)));
    writing = pipeline(
      stream,
      new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          if (upload.size < upload.header.length)
            chunk.copy(
              upload.header,
              upload.size,
              0,
              upload.header.length - upload.size
            );
          upload.size += chunk.length;
          callback(null, chunk);
        },
      }),
      createWriteStream(upload.path, { flags: "wx", mode: 0o600 }),
      { signal }
    ).catch((error: unknown) => {
      if (!signal.aborted) fail(error);
    });
  });
  const unexpectedPart = () =>
    fail(new HttpError("Expected a single file field", 400));
  parser.on("filesLimit", unexpectedPart);
  parser.on("fieldsLimit", unexpectedPart);
  parser.on("partsLimit", unexpectedPart);
  parser.on("error", (error: Error) => {
    if (!signal.aborted)
      fail(
        error instanceof HttpError
          ? error
          : new HttpError("Incomplete multipart upload", 400)
      );
  });

  const source = Readable.fromWeb(
    request.body as import("node:stream/web").ReadableStream
  );
  source.on("error", (error: Error) => {
    if (!signal.aborted)
      fail(
        error instanceof HttpError
          ? error
          : new HttpError("Interrupted upload", 400)
      );
  });

  try {
    await pipeline(
      source,
      new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytesRead += chunk.length;
          callback(
            bytesRead > maxBodySize
              ? new HttpError("File too large", 413)
              : null,
            chunk
          );
        },
      }),
      parser,
      { signal }
    );
    await writing;
    if (failure) throw failure;
    if (declared !== null && bytesRead !== Number(declared))
      throw new HttpError("Incomplete upload", 400);
    if (!file) throw new HttpError("Missing file", 400);
    file.header = file.header.subarray(0, Math.min(file.size, 16));
    signal.throwIfAborted();
    return await consume(file, signal);
  } catch (error) {
    controller.abort(error);
    await writing;
    if (failure) throw failure;
    if (deadline.aborted) throw new HttpError("Upload timed out", 408);
    if (request.signal.aborted) throw new HttpError("Interrupted upload", 400);
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
