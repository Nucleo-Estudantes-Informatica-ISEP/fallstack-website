import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import {
  deleteStorageObject,
  type StorageBucketType,
} from "@/application/services/storageAdminService";

interface StorageParams {
  type: string;
  name: string;
}

export const DELETE = defineHandler<StorageParams>({
  auth: "admin",
  handler: async ({ params }) => {
    const type: StorageBucketType = params.type === "cv" ? "cv" : "avatar";
    await deleteStorageObject(type, decodeURIComponent(params.name));
    return new NextResponse(null, { status: 204 });
  },
});
