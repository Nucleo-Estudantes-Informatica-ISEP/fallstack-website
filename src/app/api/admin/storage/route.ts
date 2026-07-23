import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import type { StorageBucketType } from "@/application/services/storageAdminService";
import { listStorageObjects } from "@/application/services/storageAdminService";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const type: StorageBucketType =
      params.get("type") === "cv" ? "cv" : "avatar";
    const { items, totalCount } = await listStorageObjects(
      type,
      Math.max(1, Number(params.get("page")) || 1),
      20,
      params.get("q") ?? undefined
    );
    return NextResponse.json({ items, totalCount });
  },
});
