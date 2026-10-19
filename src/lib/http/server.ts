import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  // Prisma 6 wraps trigger SQLSTATEs in UnknownRequestError; match only our guards.
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    for (const [message, status] of [
      ["Storage object is queued for deletion; upload a new file", 409],
      ["Ambiguous storage reference path; use a canonical URL", 400],
    ] as const) {
      if (
        error.message.includes(
          `PostgresError { code: "23514", message: "${message}"`
        )
      )
        return NextResponse.json({ error: message }, { status });
    }
  }

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

type DefineHandlerConfig<
  Params,
  Schema extends ZodType | undefined,
  Body = Schema extends ZodType ? import("zod").infer<Schema> : undefined,
> = {
  schema?: Schema;
  handler: (args: HandlerArgs<Params, Body>) => Promise<Response> | Response;
} & (
  | { auth: "none"; authorize?: never }
  | {
      auth?: Exclude<AuthPolicy, "none">;
      /** Runs after auth passes, only when a session exists. */
      authorize?: (
        session: Session,
        params: Params
      ) => boolean | Promise<boolean>;
    }
);

export function defineHandler<
  Params = Record<string, never>,
  Schema extends ZodType | undefined = undefined,
>(config: DefineHandlerConfig<Params, Schema>) {
  const auth = config.auth ?? "session";
  if (auth === "none" && config.authorize)
    throw new Error("auth:none cannot use authorize");

  return async (req: NextRequest, routeContext: RouteContext<Params>) => {
    try {
      const session = auth === "none" ? null : await getServerSession();

      if (auth !== "none" && auth !== "public" && !session)
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
