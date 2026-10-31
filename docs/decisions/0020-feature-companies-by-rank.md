# 0020: Feature companies by rank

Status: Accepted
Date: 2026-10-29
Source: [Issue #483](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/483)

## Context

The homepage needs a compact partner row below the banner. Organizers selected
Main initially and requested a rank-level backoffice option alongside the
existing page and video flags.

## Decision

Store `isFeatured` on `CompanyRankStyle`, exposed as **Destaque** when creating
or editing a rank. Render every active company whose rank has that flag. Use
the existing public roster cache and tier-section link rules; keep logos in
uniform boxes and show company names when a logo is missing.

The migration enables the existing Main rank and leaves other ranks disabled.
Subsequent selection depends only on the flag, including after a rank rename.
Order the row by rank order, then company order. Place it below the current
countdown banner without restoring the old registration homepage.

## Consequences

Admins can feature several ranks without code changes. Updating a rank uses
the existing public company-cache invalidation. Page and video entitlements
remain independent. A company-data failure hides only the partner row while
the landing page remains available.
