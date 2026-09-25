# Architecture decision records

Record each meaningful architecture or product decision in its own file. Name files `NNNN-title.md`, starting at `0001` and using a short lowercase kebab-case title. Add each new ADR to the index below in number order.

An ADR describes its context, decision, and consequences, and has a status. Keep past decisions for history. If a decision changes, add a new ADR, mark the earlier one `Superseded by ADR NNNN` with a link, and link back from the new one. Do not merge decisions into one running log.

Implementation PRs that settle a meaningful decision should add or update the corresponding ADR in that PR.

## Index

| ADR                                                   | Decision                              | Status   |
| ----------------------------------------------------- | ------------------------------------- | -------- |
| [0001](0001-track-editions-in-one-repository.md)      | Track editions in one repository      | Accepted |
| [0002](0002-use-prisma-migrate-for-schema-changes.md) | Use Prisma Migrate for schema changes | Accepted |
