import { NextResponse } from "next/server";

import config from "@/config";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { httpErrorResponse } from "@/lib/http/server";
import {
  avatarKey,
  getObject,
  logoKey,
} from "@/application/services/objectStorageService";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  context: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const params = await context.params;
    if (
      !UUID.test(params.id) ||
      (params.type !== "avatar" && params.type !== "logo")
    )
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const file = await getObject(
      params.type,
      params.type === "avatar" ? avatarKey(params.id) : logoKey(params.id)
    );
    if (!file)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (
      !(config.uploads[params.type].types as readonly string[]).includes(
        file.contentType
      ) ||
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
