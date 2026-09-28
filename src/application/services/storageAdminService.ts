import "server-only";

import { HttpError } from "@/types/HttpError";

import {
  deleteObject,
  getObject,
  listObjects,
  publicAvatarUrl,
  publicLogoUrl,
  type StorageBucket,
} from "./objectStorageService";

export interface StorageObjectDto {
  name: string;
  path: string;
  size: number | null;
  updatedAt: string | null;
  url: string;
}

export type StorageBucketType = StorageBucket;
const PREFIX = {
  avatar: "distribution/avatar",
  logo: "distribution/logo",
  cv: "distribution/cv",
};
const SAFE_OBJECT_NAME = /^[a-zA-Z0-9_.-]+$/;

function key(type: StorageBucketType, name: string) {
  if (!SAFE_OBJECT_NAME.test(name) || name.includes(".."))
    throw new HttpError("Invalid file name", 400);
  return `${PREFIX[type]}/${name}`;
}

export async function listStorageObjects(
  type: StorageBucketType,
  page: number,
  pageSize: number,
  search?: string
) {
  const files = (await listObjects(type, PREFIX[type]))
    .filter((file) => file.Key && (!search || file.Key.includes(search)))
    .sort(
      (a, b) =>
        (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0)
    );
  const items: StorageObjectDto[] = files
    .slice((page - 1) * pageSize, page * pageSize)
    .map((file) => {
      const path = file.Key!;
      const name = path.slice(PREFIX[type].length + 1);
      return {
        name,
        path,
        size: file.Size ?? null,
        updatedAt: file.LastModified?.toISOString() ?? null,
        url:
          type === "avatar"
            ? publicAvatarUrl(name)
            : type === "logo"
              ? publicLogoUrl(name)
              : `/api/admin/storage/cv/${encodeURIComponent(name)}`,
      };
    });
  return { items, totalCount: files.length };
}

export async function downloadStorageObject(
  type: StorageBucketType,
  name: string
) {
  const file = await getObject(type, key(type, name));
  if (!file) throw new HttpError("File not found", 404);
  return file;
}

export async function deleteStorageObject(
  type: StorageBucketType,
  name: string
) {
  await deleteObject(type, key(type, name));
}
