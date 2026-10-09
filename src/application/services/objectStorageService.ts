import "server-only";

import {
  DeleteObjectCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

import { storageEnv } from "@/config/env.storage";

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
    cursor = response.NextContinuationToken;
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
