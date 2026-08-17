import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";

import { HttpError } from "@/types/HttpError";
import { reportError } from "@/lib/logger";
import getServerSession from "@/application/services/sessionService";
import { AuthPolicy, passesAuthPolicy } from "@/domain/auth/authPolicy";

export const httpErrorResponse = (error: unknown) => {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  if (error instanceof ZodError)
    return NextResponse.json({ error: error.issues }, { status: 400 });

  reportError(
    error,
    { operation: "unhandled_route_error" },
    "Unhandled error in route handler"
  );
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
};

export type { AuthPolicy };
export type Session = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

type RouteContext<Params> = { params: Promise<Params> };

type HandlerArgs<Params, Body> = {
  req: NextRequest;
  session: Session | null;
  params: Params;
  body: Body;
};

interface DefineHandlerConfig<
  Params,
  Schema extends ZodType | undefined,
  Body = Schema extends ZodType ? import("zod").infer<Schema> : undefined,
> {
  auth?: AuthPolicy;
  schema?: Schema;
  /** Runs after the auth policy passes; return false to respond 403. Only called when a session exists. */
  authorize?: (session: Session, params: Params) => boolean | Promise<boolean>;
  handler: (args: HandlerArgs<Params, Body>) => Promise<Response> | Response;
}

export function defineHandler<
  Params = Record<string, never>,
  Schema extends ZodType | undefined = undefined,
>(config: DefineHandlerConfig<Params, Schema>) {
  const auth = config.auth ?? "session";

  return async (req: NextRequest, routeContext: RouteContext<Params>) => {
    try {
      const session = await getServerSession();

      if (auth !== "public" && !session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      if (!passesAuthPolicy(auth, session))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const params = await routeContext.params;

      if (config.authorize && session) {
        const allowed = await config.authorize(session, params);
        if (!allowed)
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      let body: unknown;
      if (config.schema) {
        const json = await req.json().catch(() => undefined);
        body = config.schema.parse(json);
      }

      return await config.handler({
        req,
        session,
        params,
        body: body as Schema extends ZodType
          ? import("zod").infer<Schema>
          : undefined,
      });
    } catch (error) {
      return httpErrorResponse(error);
    }
  };
}
