import "server-only";

import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { HttpError } from "@/types/HttpError";
import {
  isMp4Header,
  MAX_VIDEO_BYTES,
  videoUrl,
} from "@/domain/company/companyVideo";

import { hasPublicCompanyVideo } from "../repositories/companyRepository";
import { getVideoObject, putVideoObject } from "./objectStorageService";

export async function uploadCompanyVideo(request: Request) {
  if (request.headers.get("content-type") !== "video/mp4")
    throw new HttpError("Use an MP4 video", 400);
  const declaredSize = request.headers.get("content-length");
  if (
    declaredSize &&
    (!/^\d+$/.test(declaredSize) || Number(declaredSize) > MAX_VIDEO_BYTES)
  )
    throw new HttpError("Video exceeds 256 MiB", 413);
  if (!request.body) throw new HttpError("Missing video", 400);
  const directory = await mkdtemp(join(tmpdir(), "fallstack-video-"));
  const path = join(directory, "upload.mp4");
  let size = 0;
  try {
    await pipeline(
      Readable.fromWeb(
        request.body as import("node:stream/web").ReadableStream
      ),
      new Transform({
        transform(chunk, _encoding, callback) {
          size += chunk.length;
          callback(
            size > MAX_VIDEO_BYTES
              ? new HttpError("Video exceeds 256 MiB", 413)
              : null,
            chunk
          );
        },
      }),
      createWriteStream(path, { mode: 0o600 }),
      { signal: request.signal }
    );
    if (declaredSize && size !== Number(declaredSize))
      throw new HttpError("Incomplete video", 400);
    const file = await open(path, "r");
    const header = Buffer.alloc(4096);
    let count: number;
    try {
      count = (await file.read(header, 0, header.length, 0)).bytesRead;
    } finally {
      await file.close();
    }
    if (!isMp4Header(header.subarray(0, count)))
      throw new HttpError("Invalid MP4 file", 400);
    const id = randomUUID();
    await putVideoObject(id, path, size);
    return { id, url: videoUrl(id), size };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function companyVideoResponse(
  id: string,
  request: Request,
  head = false
) {
  if (!(await hasPublicCompanyVideo(videoUrl(id))))
    throw new HttpError("Not found", 404);
  const range = request.headers.get("range") ?? undefined;
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))
    return new Response(null, {
      status: 416,
      headers: { "Cache-Control": "no-store" },
    });
  try {
    const file = await getVideoObject(id, range, request.signal);
    if (!file?.Body) throw new HttpError("Not found", 404);
    const headers = new Headers({
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (file.ContentLength !== undefined)
      headers.set("Content-Length", String(file.ContentLength));
    if (file.ContentRange) headers.set("Content-Range", file.ContentRange);
    const stream = file.Body.transformToWebStream();
    if (head) await stream.cancel();
    return new Response(head ? null : (stream as ReadableStream<Uint8Array>), {
      status: file.ContentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidRange")
      return new Response(null, {
        status: 416,
        headers: { "Cache-Control": "no-store" },
      });
    throw error;
  }
}
