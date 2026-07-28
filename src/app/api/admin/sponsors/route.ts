import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminSponsorDto } from "@/application/dto/sponsorDto";
import {
  createSponsorForAdmin,
  listSponsorsForAdmin,
} from "@/application/services/sponsorService";
import { createAdminSponsorSchema } from "@/schemas/adminSponsorSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listSponsorsForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminSponsorDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminSponsorSchema,
  handler: async ({ body }) => {
    const sponsor = await createSponsorForAdmin(body);
    return NextResponse.json(toAdminSponsorDto(sponsor), { status: 201 });
  },
});
