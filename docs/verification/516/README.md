# Company dashboard and student profile verification (#516)

Evidence for restyling the company dashboard and the student profile views that
company employees reach.

Status: **before** captures taken on `dev` at 773f0fc (12 November 2026),
before the shared background (#484, PR #562) and shared UI styles (#515,
PR #563) were merged. Both are now in `dev` at 991638f, and the restyle builds
on them. Before captures cover D1 and S4 at 773f0fc, plus the typed-code
messages (D5) and the student 404 page at 991638f, already on the shared
background. Every other state is recorded with after captures.

## Environment

- `pnpm dev` on port 3000 with local Docker PostgreSQL 16, Redis and MinIO.
  No shared database or storage was used.
- Real login through the development AuthNEI instance. The employee account
  holds the Fallstack `employee` role and is linked to the Armis company
  through a local invite code.
- Synthetic students from `pnpm seed` (`A123`, `A456`), plus the synthetic
  `Z1xx` students described in [Test data](#test-data). No real student
  data, CVs or emails appear in the captures.
- Captures use Zen/Firefox Responsive Design Mode at DPR 1 and 100% zoom,
  with full-page screenshots (`:screenshot --fullpage --dpr 1`). Heights:
  360 × 800, 400 × 900, 768 × 1024, 1440 × 900 and 1920 × 1080.

## Route × role × state inventory

Design markers in scope at 991638f:

- Shared artwork from #484 (`artwork-clean artwork-readable`), replacing the
  `bgHero` artwork seen in the before captures:
  `CompanyProfileSectionContainer/index.tsx:133` and
  `PreviewProfileSectionContainer/index.tsx:68`.
- Old white cards, still to restyle:
  `CompanyViewProfileSectionContainer/index.tsx:115` and
  `PublicProfileSectionContainer/index.tsx:65`.

### Company dashboard (`/dashboard`)

Rendered by `CompanyProfileSectionContainer`. Only a session with an employee
profile linked to a company renders it; every other session gets the 404 page.

| ID  | Who              | State                                           | Before | After |
| --- | ---------------- | ----------------------------------------------- | ------ | ----- |
| D1  | Employee         | Sumário, no saved students                      | ✓      | ☐     |
| D2  | Employee         | Sumário, saved students listed                  | ☐      | ☐     |
| D3  | Employee         | Interests edited and saved (success, failure)   | ☐      | ☐     |
| D4  | Employee         | Scan de Perfil: camera (allowed, denied)        | ☐      | ☐     |
| D5  | Employee         | Typed code: empty, invalid, duplicate, success  | ◐      | ☐     |
| D6  | Employee         | Scan history: empty, with entries               | ☐      | ☐     |
| D7  | Employee         | CV export (`cvs-guardados.zip`): success, error | ☐      | ☐     |
| D8  | Student, no role | Any state: 404 page, no company navigation      | ☐      | ☐     |

### Student profile (`/student/[...data]`)

| ID  | Route                        | Who                     | Component                            | Before | After |
| --- | ---------------------------- | ----------------------- | ------------------------------------ | ------ | ----- |
| S1  | `/student/<code>`            | Employee, student saved | `CompanyViewProfileSectionContainer` | ☐      | ☐     |
| S2  | `/student/<code>`            | Employee, not saved     | 404 page                             | ☐      | ☐     |
| S3  | `/student/<token>/preview`   | Employee, not saved yet | `PreviewProfileSectionContainer`     | ☐      | ☐     |
| S4  | `/student/<token>/preview`   | Employee, already saved | `PreviewProfileSectionContainer`     | ✓      | ☐     |
| S5  | `/student/<invalid>/preview` | Employee, not saved     | 404 page                             | ☐      | ☐     |
| S6  | `/student/<code>`            | Admin without profile   | `PublicProfileSectionContainer`      | ☐      | ☐     |

How employees reach these screens in the app:

- **S4 is the screen employees normally see.** Saving a student from the
  camera or the typed code opens `/student/<token>/preview`, and the names in
  both saved-student lists (Sumário and Scan de Perfil) link to
  `/student/<code>/preview`. With a plain code, the preview renders only for
  an employee whose company saved the student.
- **S1 is reached only by typing `/student/<code>` in the address bar.**
  Nothing in the app links to it. Its comment box and save button never
  show, because an employee whose company has not saved the student gets
  the 404 (S2) instead.
- **S3 is not reachable from the app** (see the findings below), only by
  opening a signed preview link without saving.

The student's own profile (`ProfileSectionContainer`) belongs to #487 and is
listed only to keep the inventory complete.

Content states to capture for S1, S3 and S6: missing avatar, missing social
links, no CV, and long name, bio, links and comment.

### Viewport checklist

| Screen | 360 | 400 | 768 | 1440 | 1920 |
| ------ | --- | --- | --- | ---- | ---- |
| D1     | ✓   | ✓   | ✓   | ✓    | ✓    |
| D2     | ☐   | ☐   | ☐   | ☐    | ☐    |
| D4–D6  | ☐   | ☐   | ☐   | ☐    | ☐    |
| S1     | ☐   | ☐   | ☐   | ☐    | ☐    |
| S3     | ☐   | ☐   | ☐   | ☐    | ☐    |
| S4     | ✓   | ✓   | ✓   | ✓    | ✓    |

✓ marks a **before** capture. ◐ marks a state with before captures at 360
and 1440 only (D5: empty, invalid and duplicate; no success capture). The
other rows are filled in with after captures.

Each capture records horizontal overflow (`scrollWidth` against `clientWidth`)
and whether anything covers the camera or controls.

## Findings to resolve

- **Six-character codes.** The dashboard's typed-code field
  (`CompanySavedProfilesSection/index.tsx:215`) has `maxLength={4}`, so
  six-character codes from #514 cannot be entered. #514 (PR #555) changes
  that line; this task leaves it alone.
- **The QR modal tabs are unused.** `CompanyTab` and `ScanTab` also have a
  typed-code field and scanner, but their only entry point, `QRCodeButton`,
  is not rendered anywhere. The dashboard's Scan de Perfil tab is the only
  reachable scanner for employees, so this task restyles that one.
- **Access check on the student route.** A possible access-control gap on
  `/student/[...data]` was found while building this inventory. It is
  reported privately to the Infraestruturas Informáticas coordinators as
  [`docs/SECURITY.md`](../../SECURITY.md) asks, and is not changed in this
  task. No route, token or permission behaviour changes here.
- **Empty interests message.** On the company-facing preview (S4), a student
  without interests shows “Ainda não definiste os teus interesses…”, which
  addresses the student rather than the company viewing the profile.
- **Not-yet-saved preview (S3) is not reachable from the app.** Student QR
  codes hold the signed token itself and Wallet passes hold the student
  code, so the dashboard scanner and the typed code both save the student
  before opening `/student/<token>/preview`. Employees always land on the
  saved variant. The not-saved branch stays in the code and is covered by
  tests, plus one capture opened from a signed link without saving.
- **Typed-code messages cover the controls.** At 360 the message sits over
  the code field and the Validar button; at 1440 it covers the right end of
  the field, including the button. At 360 the button also overlaps the
  typed text (`códig`, `ZZZZ`). Repeated clicks stack identical messages.
- **Duplicate code shows an English error.** Entering an already saved code
  showed the red error “Student already saved” instead of the Portuguese
  warning “Este estudante já foi guardado anteriormente.”. `/api/saved` skips
  the duplicate check for sessions with an admin role (`allowDuplicate`), so
  the database unique constraint answers with a 400 instead of the 409 that
  the scanner handles. Caused by the test account also holding an admin
  role; confirmed in code and tracked as a separate bug, not changed in this
  task. Duplicate-save captures use an employee account without an admin
  role.

## Test data

Synthetic students loaded into the **local** Docker database and MinIO only,
outside the repository. All emails are `synthetic-516-…@example.com`; avatars
are generated gradient images and CVs are one-page generated PDFs.

| Code      | Profile                                                                                                                                    | Saved by Armis                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Z101      | Full: avatar, GitHub, LinkedIn, CV, short bio, 4 interests                                                                                 | Yes, with comment                                |
| Z102      | Minimal: no avatar, links, CV, bio or interests                                                                                            | Yes, no comment                                  |
| Z103      | Long everything: 98-character name, long email, 174/190-character links, 923-character bio with a blank line, tall avatar, CV, 6 interests | Yes, 950-character comment                       |
| Z104      | Avatar, GitHub only, CV, bio, 2 interests                                                                                                  | **No**                                           |
| Z105      | LinkedIn only, no avatar or CV, all 17 interests                                                                                           | Yes, short comment                               |
| Z111–Z122 | Minimal, “Estudante Sintético 01–12”                                                                                                       | Yes, staggered times, every third with a comment |
| A123      | From `pnpm seed`: no avatar, links, CV or interests                                                                                        | Yes                                              |
| A456      | From `pnpm seed`                                                                                                                           | Yes                                              |

With this data Armis has 18 saved students, enough to make both lists scroll.

### Recipes

Sessions: **Employee** is the Armis employee account. **Employee (no admin)**
is an Armis employee without an admin role, needed only for the duplicate
message. **Admin** is an account with an admin role and no student or
employee profile. **Student** is any student account.

| ID  | How to reach it                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Employee → `/dashboard` (Sumário). The empty state needs Armis to have no saves; see the note below.                                                                                             |
| D2  | Employee → `/dashboard` (Sumário) with the test data: 18 rows, scrolling, Z103's long name.                                                                                                      |
| D3  | Employee → Sumário → toggle interests → Guardar. Failure: DevTools → Network → Offline, then press Guardar.                                                                                      |
| D4  | Employee → Scan de Perfil → allow the camera, then reset the site permission and deny it.                                                                                                        |
| D5  | Employee → Scan de Perfil → typed code. Empty: press Validar with no text. Invalid: `ZZZZ`. Duplicate (Employee (no admin)): `Z101`. Success: `Z104`, which saves it (undo below).               |
| D6  | Employee → Scan de Perfil → Histórico de scans: with entries (test data), and empty (see the note below). Long comment: Z103's row.                                                              |
| D7  | Employee → Scan de Perfil → Download CVs: success gives `cvs-guardados.zip` with the Z101 and Z103 CVs and `dados.csv`. Error: DevTools → Network → block `cv-zip`, then press it.               |
| D8  | Student or Admin → `/dashboard`: 404 page.                                                                                                                                                       |
| S1  | Employee → `/student/Z101`, `/student/Z102`, `/student/Z103`, `/student/Z105` (address bar).                                                                                                     |
| S2  | Employee → `/student/Z104` (not saved): 404 page.                                                                                                                                                |
| S3  | Employee → a signed preview link for Z104 without saving it. Get one with `POST /api/students/token` `{"code":"Z104"}` from the logged-in browser console, then open `/student/<token>/preview`. |
| S4  | Employee → click Z101, Z102, Z103 or Z105 in either saved list, or `/student/<code>/preview`.                                                                                                    |
| S5  | Employee → `/student/not-a-token/preview`: 404 page.                                                                                                                                             |
| S6  | Admin → `/student/Z101`, `/student/Z102`, `/student/Z103`.                                                                                                                                       |

Content states for S1, S3, S4 and S6: missing avatar (Z102, Z105), missing
social links (Z102), no CV (Z102, Z105), long name, bio, links and comment
(Z103), many interests (Z105).

Notes:

- **Empty saved list and history (D1, D6 empty).** Armis also has the A123
  and A456 saves from before this task, so the empty state needs those two
  removed as well as the test data. Take these captures last.
- **Undo the D5 success save of Z104:** delete that `SavedStudent` row, or
  remove and reload the test data.
- Loading and removing the data: `bash load.sh` and `bash load.sh --cleanup`
  in the local `issue-516-test-data` folder kept next to the repository
  checkout.

## Checks

To fill in before review: `pnpm lint`, `pnpm test`, `pnpm typecheck`,
`pnpm build`, `pnpm exec prisma validate` and `git diff --check`.

## Before captures

Files are named `before-<id>-<width>.png`, for example
`before-D1-1440.png`. Captured 11–12 November 2026 as visible-viewport
screenshots, then scaled to their CSS-pixel width (DPR 1).

### D1: dashboard summary, no saved students

Old `bgHero` artwork behind the dashboard. On mobile the summary panel
continues below the first screen.

![Dashboard summary at 360](before-D1-360.png)

![Dashboard summary at 400](before-D1-400.png)

![Dashboard summary at 1024 × 768 (landscape tablet)](before-D1-1024.png)

![Dashboard summary at 1440](before-D1-1440.png)

![Dashboard summary at 1920](before-D1-1920.png)

### S4: signed preview of a saved student

Synthetic student `A123` without avatar, social links, CV or interests,
opened by an Armis employee after saving it from the typed-code scanner. Old
`bgHero` artwork behind dark panels.

![Saved student preview at 360](before-S4-360.png)

![Saved student preview at 400](before-S4-400.png)

![Saved student preview at 1024 × 768 (landscape tablet)](before-S4-1024.png)

![Saved student preview at 1440](before-S4-1440.png)

![Saved student preview at 1920](before-S4-1920.png)

### D5: typed-code messages

Taken at 991638f, with the shared background from #484. The Next.js
development indicator (bottom left) is not part of the page.

![Empty code message at 360](before-D5-empty-360.png)

![Empty code message at 1440](before-D5-empty-1440.png)

![Invalid code message at 360](before-D5-invalid-360.png)

![Invalid code message at 1440](before-D5-invalid-1440.png)

![Duplicate code message at 360](before-D5-duplicate-360.png)

![Duplicate code message at 1440](before-D5-duplicate-1440.png)

### Student route 404

Taken at 991638f. S2 and S5 render this same page.

![Student route 404 at 360](before-404-360.png)

![Student route 404 at 1440](before-404-1440.png)

## After captures

Added after the restyle, using the same IDs and widths.
