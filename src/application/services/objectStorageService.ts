import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

import { serverEnv } from "@/config/env.server";

export type StorageBucket = "avatar" | "cv";

let client: S3Client;
function storageClient() {
  return (client ??= new S3Client({
    endpoint: serverEnv.S3_ENDPOINT,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: serverEnv.S3_ACCESS_KEY_ID,
      secretAccessKey: serverEnv.S3_SECRET_ACCESS_KEY,
    },
  }));
}

function bucket(kind: StorageBucket) {
  return kind === "avatar"
    ? serverEnv.S3_BUCKET_AVATARS
    : serverEnv.S3_BUCKET_CVS;
}

export const avatarKey = (id: string) => `distribution/avatar/${id}`;
export const cvKey = (id: string) => `distribution/cv/${id}.pdf`;

export function publicAvatarUrl(id: string) {
  return `/api/media/avatar/${id}`;
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

export async function listObjects(kind: StorageBucket, prefix: string) {
  const objects: NonNullable<ListObjectsV2CommandOutput["Contents"]> = [];
  let cursor: string | undefined;
  do {
    const response = await storageClient().send(
      new ListObjectsV2Command({
        Bucket: bucket(kind),
        Prefix: `${prefix}/`,
        ContinuationToken: cursor,
      })
    );
    objects.push(...(response.Contents ?? []));
    cursor = response.NextContinuationToken;
  } while (cursor);
  return objects;
}

export async function deleteObject(kind: StorageBucket, key: string) {
  await storageClient().send(
    new DeleteObjectCommand({ Bucket: bucket(kind), Key: key })
  );
}

function isMissingObject(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "NotFound" || error.name === "NoSuchKey")
  );
}
