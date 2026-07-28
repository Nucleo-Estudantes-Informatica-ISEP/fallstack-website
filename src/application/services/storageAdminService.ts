import "server-only";

import { HttpError } from "@/types/HttpError";
import { createAdminClient } from "@/utils/supabase/admin";

export interface StorageObjectDto {
  name: string;
  path: string;
  size: number | null;
  updatedAt: string | null;
  url: string;
}

export type StorageBucketType = "avatar" | "cv";

const BUCKET_CONFIG = {
  avatar: { bucket: "avatars", prefix: "distribution/avatar", signed: false },
  cv: { bucket: "cvs", prefix: "distribution/cv", signed: true },
} as const;

// Supabase Storage's list() has no total-count response - buckets here hold
// one edition's worth of avatars/CVs (hundreds, not millions), so listing up
// to this cap and paginating/counting in memory is a reasonable trade-off
// against building a second paginated-listing API shape just for this.
const LIST_CAP = 5000;

export async function listStorageObjects(
  type: StorageBucketType,
  page: number,
  pageSize: number,
  search?: string
) {
  const { bucket, prefix, signed } = BUCKET_CONFIG[type];
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: LIST_CAP,
    sortBy: { column: "created_at", order: "desc" },
    search,
  });
  if (error || !data) return { items: [], totalCount: 0 };

  const files = data.filter((file) => file.id);
  const totalCount = files.length;
  const pageFiles = files.slice((page - 1) * pageSize, page * pageSize);

  const items: StorageObjectDto[] = await Promise.all(
    pageFiles.map(async (file) => {
      const path = `${prefix}/${file.name}`;
      const url = signed
        ? ((await admin.storage.from(bucket).createSignedUrl(path, 60 * 5)).data
            ?.signedUrl ?? "")
        : admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      return {
        name: file.name,
        path,
        size: file.metadata?.size ?? null,
        updatedAt: file.updated_at ?? null,
        url,
      };
    })
  );

  return { items, totalCount };
}

// Legitimate names are always what the avatar/cv upload routes generate -
// a bare uuidv4(), optionally with a .pdf suffix - never a path separator.
// `name` reaches here decodeURIComponent'd from the [name] route segment,
// so reject anything that could escape the intended prefix (e.g. an
// encoded ../) before it's interpolated into the object key below.
const SAFE_OBJECT_NAME = /^[a-zA-Z0-9_.-]+$/;

export async function deleteStorageObject(
  type: StorageBucketType,
  name: string
) {
  if (!SAFE_OBJECT_NAME.test(name) || name.includes(".."))
    throw new HttpError("Invalid file name", 400);

  const { bucket, prefix } = BUCKET_CONFIG[type];
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(bucket)
    .remove([`${prefix}/${name}`]);
  if (error) throw new Error(error.message);
}
