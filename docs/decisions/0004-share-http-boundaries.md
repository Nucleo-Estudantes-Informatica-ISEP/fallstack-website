# 0004: Share HTTP boundaries

Status: Accepted
Date: 2026-07-14
Source: [HTTP layer introduction](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/commit/c055bba969f77e6c08f55a4a0dfdf050575a5c4b)

## Context

Routes repeated session checks, request parsing, response creation, and error mapping. Browser callers repeated JSON fetch and error handling.

## Decision

Use `defineHandler` in `src/lib/http/server.ts` for normal JSON routes: apply an auth strategy, optional ownership check and Zod schema, then call a thin route handler. Use `httpClient` in `src/lib/http/client.ts` for browser JSON requests, with typed status errors and a `raw()` path for non-JSON responses.

## Consequences

- HTTP policy and error behavior have shared entry points; route-specific business rules remain in services and domain code.
- Routes with different transport needs, such as multipart uploads and the health probe, can stay plain route exports.
- New browser API wrappers reuse the client rather than repeating fetch handling.
