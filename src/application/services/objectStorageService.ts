import "server-only";

import { createReadStream } from "node:fs";
import { type Readable } from "node:stream";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

import { HttpError } from "@/types/HttpError";
import { storageEnv } from "@/config/env.storage";
import { videoKey } from "@/domain/company/companyVideo";

export type StorageBucket = "avatar" | "logo" | "cv";

let client: S3Client;
function storageClient() {
  return (client ??= new S3Client({
    endpoint: storageEnv.S3_ENDPOINT,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: storageEnv.S3_ACCESS_KEY_ID,
      secretAccessKey: storageEnv.S3_SECRET_ACCESS_KEY,
    },
  }));
}

let signingClient: S3Client;
export async function presignCvPost(key: string, size: number) {
  if (!storageEnv.S3_PUBLIC_ENDPOINT)
    throw new HttpError("Direct CV uploads are not configured", 503);
  // Do not load the POST signer for unrelated media/public-data requests.
  const { createPresignedPost } = await import("@aws-sdk/s3-presigned-post");
  signingClient ??= new S3Client({
    endpoint: storageEnv.S3_PUBLIC_ENDPOINT,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: storageEnv.S3_ACCESS_KEY_ID,
      secretAccessKey: storageEnv.S3_SECRET_ACCESS_KEY,
    },
  });
  // Exact size is stricter than just the global ceiling. The file part MUST
  // be last. No ACL, arbitrary key, content type or success redirect allowed.
  return createPresignedPost(signingClient, {
    Bucket: bucket("cv"),
    Key: key,
    Expires: storageEnv.CV_UPLOAD_TTL_SECONDS,
    Fields: { "Content-Type": "application/pdf", success_action_status: "204" },
    Conditions: [
      ["content-length-range", size, size],
      ["eq", "$Content-Type", "application/pdf"],
      ["eq", "$success_action_status", "204"],
    ],
  });
}

export async function headCvObject(key: string, signal: AbortSignal) {
  try {
    return await storageClient().send(
      new HeadObjectCommand({ Bucket: bucket("cv"), Key: key }),
      { abortSignal: signal }
    );
  } catch (error) {
    if (isMissingObject(error))
      throw new HttpError("Upload object not found", 409);
    throw error;
  }
}

export async function readCvRange(
  key: string,
  start: number,
  end: number,
  etag: string,
  signal: AbortSignal
) {
  const response = await storageClient().send(
    new GetObjectCommand({
      Bucket: bucket("cv"),
      Key: key,
      Range: `bytes=${start}-${end}`,
      IfMatch: etag,
    }),
    { abortSignal: signal }
  );
  const body = response.Body as Readable | undefined;
  if (
    !body ||
    response.ContentRange !==
      `bytes ${start}-${end}/${response.ContentRange?.split("/")[1]}` ||
    response.ContentLength !== end - start + 1
  ) {
    body?.destroy();
    throw new Error("Storage did not honor bounded range");
  }
  const chunks: Buffer[] = [];
  let length = 0;
  try {
    for await (const chunk of body) {
      length += chunk.length;
      if (length > end - start + 1)
        throw new Error("Storage exceeded bounded range");
      chunks.push(Buffer.from(chunk));
    }
    if (length !== end - start + 1) throw new Error("Incomplete storage range");
    return Buffer.concat(chunks);
  } finally {
    body.destroy();
  }
}

export async function promoteCvObject(
  source: string,
  destination: string,
  etag: string,
  signal: AbortSignal
) {
  await storageClient().send(
    new CopyObjectCommand({
      Bucket: bucket("cv"),
      Key: destination,
      CopySource: `${bucket("cv")}/${source.split("/").map(encodeURIComponent).join("/")}`,
      CopySourceIfMatch: etag,
      MetadataDirective: "REPLACE",
      ContentType: "application/pdf",
      ContentDisposition: 'attachment; filename="cv.pdf"',
    }),
    { abortSignal: signal }
  );
}

function bucket(kind: StorageBucket) {
  return kind === "avatar"
    ? storageEnv.S3_BUCKET_AVATARS
    : kind === "logo"
      ? storageEnv.S3_BUCKET_LOGOS
      : storageEnv.S3_BUCKET_CVS;
}

export async function assertUnversionedBucket(
  kind: StorageBucket,
  signal?: AbortSignal
) {
  const result = await storageClient().send(
    new GetBucketVersioningCommand({ Bucket: bucket(kind) }),
    { abortSignal: signal }
  );
  // Simple DeleteObject would only add a delete marker on a versioned bucket.
  if (result.Status)
    throw new Error("Storage cleanup requires unversioned buckets");
}

export const avatarKey = (id: string) => `distribution/avatar/${id}`;
export const logoKey = (id: string) => `distribution/logo/${id}`;
export const cvKey = (id: string) => `distribution/cv/${id}.pdf`;

export function publicAvatarUrl(id: string) {
  return `/api/media/avatar/${id}`;
}

export function publicLogoUrl(id: string) {
  return `/api/media/logo/${id}`;
}

export async function putObject(
  kind: StorageBucket,
  key: string,
  bytes: Uint8Array,
  contentType: string
) {
  await storageClient().send(
    new PutObjectCommand({
      Bucket: bucket(kind),
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })
  );
}

/** Upload a validated staged file; the caller owns and closes the stream. */
export async function putObjectStream(
  kind: StorageBucket,
  key: string,
  body: Readable,
  contentType: string,
  contentLength: number,
  signal?: AbortSignal
) {
  await storageClient().send(
    new PutObjectCommand({
      Bucket: bucket(kind),
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { abortSignal: signal }
  );
}

export async function objectExists(kind: StorageBucket, key: string) {
  try {
    await storageClient().send(
      new HeadObjectCommand({ Bucket: bucket(kind), Key: key })
    );
    return true;
  } catch (error) {
    if (isMissingObject(error)) return false;
    throw error;
  }
}

export async function getObject(kind: StorageBucket, key: string) {
  try {
    const response = await storageClient().send(
      new GetObjectCommand({ Bucket: bucket(kind), Key: key })
    );
    return {
      bytes: await response.Body!.transformToByteArray(),
      contentType: response.ContentType ?? "application/octet-stream",
    };
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

/** Stream large objects so CV downloads do not buffer a 10 MiB PDF per request. */
export async function getObjectStream(
  kind: StorageBucket,
  key: string,
  signal?: AbortSignal
) {
  try {
    const response = await storageClient().send(
      new GetObjectCommand({ Bucket: bucket(kind), Key: key }),
      { abortSignal: signal }
    );
    if (!response.Body) return null;
    return {
      body: response.Body.transformToWebStream(),
      contentType: response.ContentType ?? "application/octet-stream",
      contentLength: response.ContentLength,
    };
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

export async function listObjects(
  kind: StorageBucket,
  prefix: string,
  signal?: AbortSignal
) {
  const objects: NonNullable<ListObjectsV2CommandOutput["Contents"]> = [];
  let cursor: string | undefined;
  do {
    const response = await storageClient().send(
      new ListObjectsV2Command({
        Bucket: bucket(kind),
        Prefix: `${prefix}/`,
        ContinuationToken: cursor,
      }),
      { abortSignal: signal }
    );
    objects.push(...(response.Contents ?? []));
    const next = response.NextContinuationToken;
    if (response.IsTruncated && (!next || next === cursor))
      throw new Error("Incomplete storage listing");
    cursor = response.IsTruncated ? next : undefined;
  } while (cursor);
  return objects;
}

export async function deleteObject(
  kind: StorageBucket,
  key: string,
  signal?: AbortSignal
) {
  await storageClient().send(
    new DeleteObjectCommand({ Bucket: bucket(kind), Key: key }),
    { abortSignal: signal }
  );
}

function isMissingObject(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "NotFound" || error.name === "NoSuchKey")
  );
}

// Videos share the edition's public-media bucket under a separate prefix.
export async function putVideoObject(id: string, path: string, size: number) {
  const stream = createReadStream(path);
  try {
    await storageClient().send(
      new PutObjectCommand({
        Bucket: bucket("logo"),
        Key: videoKey(id),
        Body: stream,
        ContentLength: size,
        ContentType: "video/mp4",
      })
    );
  } finally {
    stream.destroy();
  }
}

export async function getVideoObject(
  id: string,
  range?: string,
  signal?: AbortSignal
) {
  try {
    return await storageClient().send(
      new GetObjectCommand({
        Bucket: bucket("logo"),
        Key: videoKey(id),
        Range: range,
      }),
      { abortSignal: signal }
    );
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}
