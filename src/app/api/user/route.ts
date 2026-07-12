import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/services/apiResponse";
import getServerSession from "@/application/services/sessionService";
import { updateUserInterests } from "@/application/services/userService";

const schema = z.object({ interests: z.array(z.string()) });

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return errorResponse("Unauthorized", 401);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return errorResponse(parsed.error, 400);
  return NextResponse.json(
    await updateUserInterests({
      userId: session.id,
      companyId: session.employee?.companyId,
      interests: parsed.data.interests,
    })
  );
}
