import { NextResponse } from "next/server";

import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { httpErrorResponse } from "@/lib/http/server";
import {
  avatarKey,
  getObject,
} from "@/application/services/objectStorageService";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    if (!UUID.test(params.id))
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const file = await getObject("avatar", avatarKey(params.id));
    if (!file)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (
      !config.uploads.avatar.types.includes(file.contentType) ||
      !matchesDeclaredType(file.bytes, file.contentType)
    )
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(file.bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return httpErrorResponse(error);
  }
}
