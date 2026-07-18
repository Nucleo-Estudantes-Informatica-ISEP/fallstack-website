import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateUserInterests } from "@/application/services/userService";
import { userInterestsSchema } from "@/schemas/userInterestsSchema";

export const PATCH = defineHandler({
  auth: "session",
  schema: userInterestsSchema,
  handler: async ({ session, body }) => {
    return NextResponse.json(
      await updateUserInterests({
        userId: session!.id,
        companyId: session!.employee?.companyId,
        interests: body.interests,
      })
    );
  },
});
