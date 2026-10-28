# Database architecture

[`prisma/schema.prisma`](../prisma/schema.prisma) defines the current Prisma
models, columns, nullability, defaults, and relations. This page maps the model
and explains rules that are easy to miss when reading the schema. For migration
commands and deployment order, see the [database workflow](database-workflow.md).

## Entity relationships

The diagram includes every Prisma model and relation. Attributes show keys and
fields relevant to the notes below; consult the schema for the full column list.
`PK`, `FK`, and `UK` denote primary, foreign, and unique keys. Optionality on
relationship lines describes the Prisma relation, not whether a row currently
exists in production.

```mermaid
erDiagram
    User {
        UUID id PK
        String zitadelUserId UK
        String email UK
        Role role
        AdminRole adminRole
        Boolean active
    }
    Student {
        UUID id PK,FK
        String code UK
        Year year
        String avatar
        String cv
        DateTime cvUploadedAt
        DateTime cvPurgedAt
    }
    Employee {
        UUID id PK,FK
        UUID companyId FK
    }
    Company {
        UUID id PK
        String name UK
        UUID rankId FK
        String avatar
        Boolean active
        String code UK
        String employeeInviteCodeHash UK
    }
    CompanyRank {
        UUID id PK
        String name UK
        Int order
    }
    CompanyRankStyle {
        UUID id PK
        UUID rankId FK,UK
    }
    CompanyProfile {
        UUID id PK
        UUID companyId FK,UK
        Json socialLinks
        Json facts
    }
    CompanyDisplayStyle {
        UUID id PK
        UUID companyId FK,UK
    }
    Action {
        UUID id PK
        String name UK
        UUID companyId FK,UK
        Int points
    }
    ActionCompletion {
        UUID id PK
        UUID actionId FK
        UUID studentId FK
        DateTime completedAt
    }
    Interest {
        UUID id PK
        Json name
    }
    SavedStudent {
        UUID studentId PK,FK
        UUID employeeId PK,FK
        UUID companyId FK
        DateTime createdAt
        String comment
    }
    Sponsor {
        UUID id PK
        String name UK
        String logo
        Boolean active
    }
    ScheduleEvent {
        UUID id PK
        Int day
        Int order
        String startTime
        String endTime
        Json activity
    }
    FaqEntry {
        UUID id PK
        Int order UK
        Json question
        Json answer
    }

    User ||--o| Student : profile
    User ||--o| Employee : profile
    Company ||--o{ Employee : employs
    CompanyRank ||--o{ Company : ranks
    CompanyRank ||--o| CompanyRankStyle : style
    Company ||--o| CompanyProfile : profile
    Company ||--o| CompanyDisplayStyle : display_style
    Company |o--o| Action : booth_action
    Action ||--o{ ActionCompletion : completed_in
    Student ||--o{ ActionCompletion : completes
    Student }o--o{ Interest : interests
    Company }o--o{ Interest : interests
    Student ||--o{ SavedStudent : saved
    Employee ||--o{ SavedStudent : attributed_to
    Company ||--o{ SavedStudent : owns
```

`Student.id` and `Employee.id` are also `User.id`: these are shared-primary-key
profiles, not separate identities. Prisma manages the two implicit many-to-many
relations through `_InterestToStudent` and `_CompanyToInterest`. `Sponsor`,
`ScheduleEvent`, and `FaqEntry` have no model relations. `SavedStudent` has a
composite primary key `(studentId, employeeId)` plus a separate unique key
`(studentId, companyId)`; `ActionCompletion` has a unique key
`(actionId, studentId)`; `ScheduleEvent` has a unique key `(day, order)`.

## Design notes

### Saved students: employee attribution, company grain

One `SavedStudent` row records which employee saved a student, but the product
allows one save per **student and company**. The `(studentId, companyId)` unique
constraint is the final guard even when two employees save concurrently. The
service checks for an existing company save before inserting and maps a database
uniqueness race to an error. An admin save still needs an employee from the
chosen company for attribution. The separate foreign keys do **not** prove that
`savedBy.companyId` equals `SavedStudent.companyId`; callers must supply a
matching pair. The save and optional booth-action completion share a transaction,
so a failed completion rolls back the save. See
[data ownership](architecture.md#data-ownership).

### Interests belong to their subjects

`Student.interests` and `Company.interests` are separate many-to-many relations
to the same `Interest` catalog. Company interests are stored once per company,
not copied to each employee. Updating an employee's company's interests changes
the company set; new employees see that same set. The migration from the old
user/employee relation preserved student interests and collapsed employee copies
into company interests.
Deleting an interest removes its join rows, not its students or companies.

### Storage references are outside PostgreSQL

`Student.cv` holds an object ID; student/company avatars and sponsor logos hold
media references. These fields are strings, not foreign keys to MinIO. A DB
transaction cannot atomically commit an object upload or delete, and deleting a
profile does not cascade to its objects. Upload paths check object existence
where needed, but orphan objects and stale references still require a separately
reviewed S3 reconciliation process. Do not use legacy Supabase Storage SQL jobs
against the current PostgreSQL/MinIO setup. See [shared data](SHARED_DATA.md).

`cvUploadedAt` is the CV-specific retention clock: a profile edit updates
`Student.updatedAt` but does not restart CV retention. Purging a CV clears `cv`
and stamps `cvPurgedAt` for the student notice; the last upload timestamp stays
available. A later upload refreshes `cvUploadedAt` and clears `cvPurgedAt`.

### Account and edition boundaries

`User.id` is application-owned while optional `zitadelUserId` links the external
OIDC identity. `User.role` identifies a student or employee profile;
`adminRole` is a separate local admin tier, and an admin-only account can have
no profile. `User.active` gates this application, not the shared identity.
Runtime admin authorization also checks the signed session's external grant;
the local column alone is insufficient. See [authentication](architecture.md#authentication-and-short-lived-tokens).

`Company.active` defaults to false for self-registration review; admin-created
`Sponsor.active` defaults to true. Company rank and rank style are data, with a
required rank and optional one-to-one style/profile/display records. An
`Action.companyId` is nullable because most actions are not booth actions, and
unique because a company has at most one linked booth action. Completing an
action is unique per student and action. Actions, sponsors, FAQ, and schedule
are edition content stored in DB rather than hardcoded page data; see
[ADR 0006](decisions/0006-store-editable-event-content-in-database.md).

`ScheduleEvent.day` is a 1-based edition slot, not a calendar date.
`startTime` and `endTime` are zero-padded 24-hour `HH:MM` strings; schedule
validation checks overlaps in application code. `Interest.name`,
`ScheduleEvent.activity`, and FAQ text use JSON for translated content.

The schedule `(day, order)` and FAQ `order` unique constraints are
**deferrable, initially deferred** in PostgreSQL. This permits two occupied
positions to swap inside one transaction while still rejecting a duplicate
final position at commit, including concurrent reorders. Prisma's `@unique`
declarations show the keys; the deferral behavior lives in
[`20260816030000_unique_admin_display_orders`](../prisma/migrations/20260816030000_unique_admin_display_orders/migration.sql)
and is covered by the
[PostgreSQL invariant tests](../tests/e2e/postgresInvariants.test.ts).

Keep constraints and point-of-change invariant comments in
[`schema.prisma`](../prisma/schema.prisma). Update this diagram and these notes
with model changes; this page does not replace the schema or migrations.
