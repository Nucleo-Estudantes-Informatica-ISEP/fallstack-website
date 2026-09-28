# Architecture decision records

Record each meaningful architecture or product decision in its own file. Name files `NNNN-title.md`, starting at `0001` and using a short lowercase kebab-case title. Add each new ADR to the index below in number order.

An ADR describes its context, decision, and consequences, and has a status. Keep past decisions for history. If a decision changes, add a new ADR, mark the earlier one `Superseded by ADR NNNN` with a link, and link back from the new one. Do not merge decisions into one running log.

Use this outline for each ADR; omit `Source` and `Supersedes` when they do not apply:

```markdown
# NNNN: Title

Status: Accepted
Date: YYYY-MM-DD
Source: [Original decision](link)
Supersedes: [ADR NNNN](NNNN-title.md)

## Context

## Decision

## Consequences
```

See the [contribution workflow](../agents/contribution.md) for when an
implementation PR needs an ADR.

## Index

| ADR                                                   | Decision                              | Status   |
| ----------------------------------------------------- | ------------------------------------- | -------- |
| [0001](0001-track-editions-in-one-repository.md)      | Track editions in one repository      | Accepted |
| [0002](0002-use-prisma-migrate-for-schema-changes.md) | Use Prisma Migrate for schema changes | Accepted |
