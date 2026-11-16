# 0043: Independent operational deployment modes

Status: Accepted
Date: 2026-11-16
Source: [Issue 418](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/418)

## Context

Registration closure still runs Next, sessions, storage and public database reads.
The public landing must survive stopping the application and event Redis.

## Decision

Select OFF-SEASON, PREPARATION or EVENT explicitly. Dates only affect countdown
presentation. Build a separate allowlisted HTML/CSS/JS artifact from this same
repository, using edition branding and shared seasonal copy. It has no Next
runtime, session, API, image optimizer or storage client. Only repository-owned
brand logos are displayed; they are packaged locally. No editable partner,
sponsor, FAQ or schedule data is duplicated into constants. If those sections
are added later, export a reviewed public snapshot and its actual logo bytes at
build time; never ship live MinIO URLs or credentials.

PREPARATION keeps that public artifact and runs the existing app on a private
staff host behind a client-certificate gateway, plus existing app authorization.
Allowlist backoffice/staff routes and their required assets/API calls; deny other
application surfaces. Require a current dedicated-CA CRL and disable TLS session
tickets so revoked staff credentials cannot resume a previously accepted session.
EVENT restores the application public origin explicitly. Preserve ADR 0001's
single repository and ADR 0006's database ownership of editable content.

Retain shared services, persistent data, backups, and daily one-shot cleanup
instead of an idle daemon. Operational transitions require staging evidence and
real installed-PWA checks before production activation.
The scheduled cleanup unit audits safely by default but fails explicitly until
the reviewed apply drop-in is installed; an audit must not report successful
retention or justify stopping an existing cleanup daemon.

## Consequences

The static artifact can run with no DB, storage, identity or Redis connectivity.
Old service workers must receive the replacement worker before cached entry
paths can be retired. Offline devices cannot be remotely purged. Operators own
network isolation, schedules, recovery rehearsals and measured savings; a build
cannot establish those facts. See the [runbook](../operations/deployment-modes.md).
