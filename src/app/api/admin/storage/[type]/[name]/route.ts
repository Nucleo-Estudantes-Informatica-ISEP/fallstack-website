import { NextResponse } from "next/server";

import { HttpError } from "@/types/HttpError";
import { defineHandler } from "@/lib/http/server";
import {
  deleteStorageObject,
  downloadStorageObject,
  type StorageBucketType,
} from "@/application/services/storageAdminService";

function storageType(value: string): StorageBucketType {
  if (value !== "avatar" && value !== "cv")
    throw new HttpError("Invalid storage type", 400);
  return value;
}

export const GET = defineHandler<StorageParams>({
  auth: "admin",
  handler: async ({ params }) => {
    const file = await downloadStorageObject(
      storageType(params.type),
      params.name
    );
    return new NextResponse(file.bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, no-store",
      },
    });
  },
});

interface StorageParams {
  type: string;
  name: string;
}

export const DELETE = defineHandler<StorageParams>({
  auth: "admin",
  handler: async ({ params }) => {
    await deleteStorageObject(storageType(params.type), params.name);
    return new NextResponse(null, { status: 204 });
  },
});
