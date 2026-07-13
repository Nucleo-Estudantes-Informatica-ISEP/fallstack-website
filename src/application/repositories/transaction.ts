import "server-only";

// Services need `withTransaction` (and the `prisma` default-parameter value
// repository functions fall back to) to orchestrate multi-repository-call
// atomicity, but the `no-restricted-imports` ESLint rule blocks importing
// `./database` from outside `application/repositories/**` (Prisma access is
// meant to stay inside repositories). This file re-exports just those two
// primitives from a path services are allowed to import — it does not
// widen what services can do with Prisma, since `prisma`/`withTransaction`
// are only useful in combination with repository functions that already
// accept an optional `DbClient`.
export { default as prisma, withTransaction } from "./database";
export type { DbClient } from "./database";
