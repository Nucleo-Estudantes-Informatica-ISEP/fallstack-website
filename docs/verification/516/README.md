# Company dashboard and student profile verification (#516)

Evidence for restyling the company dashboard and the student profile views that
company employees reach.

Status: **before** captures taken on `dev` at 773f0fc (12 November 2026),
before the shared background (#484, PR #562) and shared UI styles (#515,
PR #563) were merged. Both are now in `dev` at 991638f, and the restyle builds
on them. Before captures cover D1 and S4 at 773f0fc, plus the typed-code
messages (D5) and the student 404 page at 991638f, already on the shared
background. Every other state is recorded with after captures.

**After** captures taken on this branch at 569818c (13 November 2026): every
inventory row except D1, which is explained in [After
captures](#after-captures).

## Environment

- `pnpm dev` on port 3000 with local Docker PostgreSQL 16, Redis and MinIO.
  No shared database or storage was used.
- Real login through the development AuthNEI instance. The employee account
  holds the Fallstack `employee` role and is linked to the Armis company
  through a local invite code.
- Synthetic students from `pnpm seed` (`A123`, `A456`), plus the synthetic
  `Z1xx` students described in [Test data](#test-data). No real student
  data, CVs or emails appear in the captures.
- Before captures use Zen/Firefox Responsive Design Mode at DPR 1 and 100%
  zoom. Heights: 360 × 800, 400 × 900, 768 × 1024, 1440 × 900 and
  1920 × 1080.
- After captures use headless Chrome 156 (Playwright with the installed
  Chrome) at the same sizes and DPR 1, signed in with the local
  `pnpm dev:session` identities described in [Test data](#test-data). The
  camera is Chrome's fake capture device (a moving test pattern), allowed or
  denied per capture. The Next.js development indicator is hidden. Files are
  reduced to 256-colour PNGs.

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
| D1  | Employee         | Sumário, no saved students                      | ✓      | ✗     |
| D2  | Employee         | Sumário, saved students listed                  | ☐      | ✓     |
| D3  | Employee         | Interests edited and saved (success, failure)   | ☐      | T     |
| D4  | Employee         | Scan de Perfil: camera (allowed, denied)        | ☐      | ✓     |
| D5  | Employee         | Typed code: empty, invalid, duplicate, success  | ◐      | ◐ T   |
| D6  | Employee         | Scan history: empty, with entries               | ☐      | ◐     |
| D7  | Employee         | CV export (`cvs-guardados.zip`): success, error | ☐      | T     |
| D8  | Student, no role | Any state: 404 page, no company navigation      | ☐      | ✓     |

### Student profile (`/student/[...data]`)

| ID  | Route                        | Who                     | Component                            | Before | After |
| --- | ---------------------------- | ----------------------- | ------------------------------------ | ------ | ----- |
| S1  | `/student/<code>`            | Employee, student saved | `CompanyViewProfileSectionContainer` | ☐      | ✓     |
| S2  | `/student/<code>`            | Employee, not saved     | 404 page                             | ☐      | ✓     |
| S3  | `/student/<token>/preview`   | Employee, not saved yet | `PreviewProfileSectionContainer`     | ☐      | ✓     |
| S4  | `/student/<token>/preview`   | Employee, already saved | `PreviewProfileSectionContainer`     | ✓      | ✓     |
| S5  | `/student/<invalid>/preview` | Employee, not saved     | 404 page                             | ☐      | ✓     |
| S6  | `/student/<code>`            | Admin without profile   | `PublicProfileSectionContainer`      | ☐      | ✓     |

In the After column, ✗ and ◐ mark the empty saved list (D1, and the empty
half of D6), which has no after capture. T marks message states recorded in
text instead of captures (D3, D7, and the D4 and D5 messages; D4 and D5 are
otherwise captured). See [After captures](#after-captures).

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

| Screen | 360 | 400 | 768 | 1024 | 1440 | 1920 |
| ------ | --- | --- | --- | ---- | ---- | ---- |
| D1     | B   | B   |     | B    | B    | B    |
| D2     | A   |     | A   |      | A    |      |
| D4–D6  | A   |     | A   |      | A    |      |
| S1     | A   |     | A   |      | A    |      |
| S3     | A   |     | A   |      | A    |      |
| S4     | B A | B   | A   | B    | B A  | B    |

B is a **before** capture and A an **after** capture. After captures keep
one phone (360), one tablet (768) and one desktop (1440) width; every other
state has them at 360 and 1440. The before set used a 1024 × 768 landscape
tablet. Horizontal overflow was still measured at all five widths for every
screen; see [Horizontal overflow](#horizontal-overflow).

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
- **404 digits are below 3:1 on the artwork.** The orange `404` on the shared
  not-found page (`src/app/not-found.tsx`) averages 3.5–3.9:1 against the
  artwork but drops to 2.8:1 over its lightest areas (1.8:1 at 360). That
  page is shared and is not changed in this task. S2, S5 and D8 render it.
- **Avatar alt text is in English.** The shared `UserImage` component labels
  every avatar “profile image”. Not changed in this task.

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

`Z100` (“Carolina Referência”, not saved) is linked to the `local-student`
identity that `pnpm dev:session` mints. It provides the student session used
for the student dashboard reference captures, since the company dashboard
mirrors the student dashboard's format in its own code.

“Empregado Sintético” is an Armis employee **without** an admin role, linked
to the `local-armis` identity from `pnpm dev:session`. It provides the
Employee (no admin) session in the recipes without a real login.

“Admin Sintético” (`synthetic-516-admin@example.com`) is an admin-only
account with no student or employee profile, linked to the `local-admin`
identity from `pnpm dev:session`. It provides the Admin session for S6 and
D8.

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

## Accessibility and layout sweep

Run on 13 November 2026 against `pnpm dev` with the test data, in headless
Chrome (Playwright with the installed Chrome) at the checklist's viewport
sizes. Session: the Employee (no admin) account; D8 uses the student account.
S6 was added during the after captures, with the Admin account. D1 (no saved
students) was not run separately: it is the D2 frame with an empty list.

### Horizontal overflow

`scrollWidth` against `clientWidth` of the page, plus any element inside
`<main>` that extends past the viewport. ✓ means neither happens.

| Screen                      | 360 | 400 | 768 | 1440 | 1920 |
| --------------------------- | --- | --- | --- | ---- | ---- |
| D2: Sumário, 18 saved       | ✓   | ✓   | ✓   | ✓    | ✓    |
| D4–D6: Scan, camera allowed | ✓   | ✓   | ✓   | ✓    | ✓    |
| D4: Scan, camera denied     | ✓   | ✓   | ✓   | ✓    | ✓    |
| D6: comment editor open     | ✓   | ✓   | ✓   | ✓    | ✓    |
| D8: student on `/dashboard` | ✓   | ✓   | ✓   | ✓    | ✓    |
| S1: Z101, Z102, Z103, Z105  | ✓   | ✓   | ✓   | ✓    | ✓    |
| S2: not saved (404)         | ✓   | ✓   | ✓   | ✓    | ✓    |
| S3: Z104, signed link       | ✓   | ✓   | ✓   | ✓    | ✓    |
| S4: Z101, Z102, Z103, Z105  | ✓   | ✓   | ✓   | ✓    | ✓    |
| S5: invalid token (404)     | ✓   | ✓   | ✓   | ✓    | ✓    |
| S6: Z101, Z102, Z103, admin | ✓   | ✓   | ✓   | ✓    | ✓    |

Long content: Z103's name wraps in the headings and is clamped to two lines,
with the full name in a tooltip, in both saved lists. Its email, links and bio
wrap. With the camera allowed, the video fills its 4:3 box at every width.

### Text contrast

Every text and background pair inside `<main>` on the screens above. Over the
artwork, the background is the artwork's lightest pixel under the
`artwork-readable` overlay (#6A494C), the worst case. Semi-transparent colours
are blended with what is behind them.

| Where                                                | Text on background         | Ratio    | Needed |
| ---------------------------------------------------- | -------------------------- | -------- | ------ |
| Action buttons (Guardar, Validar, Download CVs)      | #FFFFFF on #B1440A         | 5.67:1   | 4.5:1  |
| “SALVO” in the Sumário list                          | #F97316 on #141414         | 6.57:1   | 4.5:1  |
| Dashboard and profile subtitle, over the artwork     | #F3F4F6 on #6A494C         | 7.15:1   | 4.5:1  |
| Dashboard and profile name (45 px), over the artwork | #FFFFFF on #6A494C         | 7.86:1   | 3:1    |
| Table headers in both saved lists                    | #B9B9B9 on #141414         | 9.34:1   | 4.5:1  |
| “Curriculum” label in the CV button                  | #D1D5DC on #2B1E14         | 10.98:1  | 4.5:1  |
| Unselected interests                                 | #D0D0D0 on #141414         | 11.94:1  | 4.5:1  |
| Muted text and the code field placeholder            | #D1D3D4 on #141414         | 12.26:1  | 4.5:1  |
| Profile panel titles                                 | #D1D5DC on #141414         | 12.51:1  | 4.5:1  |
| GitHub and LinkedIn buttons, over the artwork        | #FFFFFF on #402C2E         | 12.98:1  | 4.5:1  |
| Selected interests                                   | #FFFFFF on #2C2C2C         | 13.97:1  | 4.5:1  |
| “Voltar ao painel”, over the artwork                 | #FFFFFF on #352526         | 14.54:1  | 4.5:1  |
| History comments                                     | #E8E8E8 on #141414         | 14.97:1  | 4.5:1  |
| Student interest chips                               | #FFFFFF on #362214         | 15.05:1  | 4.5:1  |
| Profile email                                        | #E5E7EB on #080808         | 16.18:1  | 4.5:1  |
| Bio, menu, headings and body text                    | #F3F4F6–#FFFFFF on #141414 | ≥16.74:1 | 4.5:1  |

No pair in the restyled screens is under 4.5:1. The only failure is the
shared 404 page's `404` digits (see [Findings](#findings-to-resolve)). S6
uses the same pairs; its lowest is 7.15:1. Its keyboard order, focus
outlines and accessible names were checked the same way, with no findings.

Focus indicators: the menu's orange ring measures at least 4.6:1 against the
real artwork pixels around each menu button, and the other rings are orange
or white on dark panels (at least 6.5:1).

### Keyboard

Tab and Shift+Tab through every screen above at 360 and 1440, waiting for
scrolling to finish after each key.

| Check                          | Result                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Order                          | Follows the reading order: top bar, menu, tab content, list rows (name, then its comment button), footer.                     |
| Visible focus                  | Every stop in `<main>` matches `:focus-visible` and shows an outline.                                                         |
| Traps                          | None. Every walk leaves `<main>` for the footer, and Shift+Tab returns to the top bar.                                        |
| Hidden under the fixed top bar | Fixed. Shift+Tab used to hide the code field and Validar (360) and Download CVs (1440) under the bar; they now keep a margin. |
| Focus after a typed-code error | Fixed. Invalid and duplicate codes used to drop focus to the page; it now returns to the code field.                          |
| Comment editor                 | Opening moves focus to the comment field; Escape closes it and returns focus to “Editar comentário sobre …”.                  |

### Accessible names

Every link, button, field and image in `<main>` has a name, checked in
Chrome's accessibility tree. Links that open a new tab say so (“GitHub de
Beatriz Sintética (abre num novo separador)”); history buttons name the
student (“Editar comentário sobre …”); interest buttons expose
`aria-pressed`. The camera box is now a group named “Câmara do leitor de QR
Code”, since the video itself has no name. Avatars use the shared English
alt text “profile image” (see [Findings](#findings-to-resolve)).

### Messages over the camera and controls

Typed-code messages, triggered twice each to check that copies do not stack:

| Message                       | 360 | 400 | 768 | 1440 | 1920 |
| ----------------------------- | --- | --- | --- | ---- | ---- |
| Empty: “Sem código inserido.” | ✓   | ✓   | ✓   | ✓    | ✓    |
| Invalid: `ZZZZ`               | ✓   | ✓   | ✓   | ✓    | ✓    |
| Duplicate: `Z101`             | ✓   | ✓   | ✓   | ✓    | ✓    |

✓: one message, announced as an alert, covering none of the code field,
Validar or the camera, with focus back in the code field.

Camera messages: with the camera denied, “Não foi possível aceder à câmara…”
covers the bottom of the empty camera box (78 px at 360; a 132 × 102 px
corner at 1440) until it closes after 5 seconds. The same bottom-corner
position would apply to a QR scan error while the camera is running, when the
camera's bottom edge is near the bottom of the screen. Not changed: decision
pending.

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

Files are named `after-<id>-<width>.png`, for example `after-D2-1440.png`.
Taken on 13 November 2026 at 569818c, as described in
[Environment](#environment). Screens whose content runs below the first
screen are full-page captures; the comment editor and the 404 pages show the
visible screen. Message states are recorded in text, not captures. Every capture was checked for horizontal overflow, and
none has any.

**Not captured: D1 and the empty half of D6.** Both need Armis to have no
saved students, which means removing the `A123` and `A456` saves from
`pnpm seed` as well as the test data. They show the same frame as D2 and D6
with an empty list; the empty-list text is covered by the component tests.

### D2: Sumário with 18 saved students

The saved list scrolls inside its panel.

![Sumário at 360](after-D2-360.png)

![Sumário at 768](after-D2-768.png)

![Sumário at 1440](after-D2-1440.png)

### D4–D6: Scan de Perfil with the camera allowed

The camera box shows Chrome's fake camera. The full page includes the typed
code (D5) and the scan history with Z103's long name and comment (D6).

![Scan de Perfil at 360](after-D4-D6-360.png)

![Scan de Perfil at 768](after-D4-D6-768.png)

![Scan de Perfil at 1440](after-D4-D6-1440.png)

### D5: typed code saved

`Z104` typed, saved and opened as a saved preview (S4). The save was removed
after each capture.

![Preview after saving Z104 at 360](after-D5-success-360.png)

![Preview after saving Z104 at 1440](after-D5-success-1440.png)

### D6: comment editor open

Z103's 950-character comment in the editor, with its character count.

![Comment editor at 360](after-D6-edit-360.png)

![Comment editor at 1440](after-D6-edit-1440.png)

### Messages (not captured)

Message states were checked at 360 and 1440 but are recorded in text only.
Each shows one toast at the bottom (full width on phones, bottom right on
desktop) that closes after 5 seconds:

| State                        | Message                                                                   | Result                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| D3 interests saved           | “Interesses guardados com sucesso!”                                       | Shown                                                                                                                           |
| D3 interests not saved       | “Não foi possível guardar os interesses. Tenta novamente.”                | Shown when the request fails                                                                                                    |
| D4 camera denied             | “Não foi possível aceder à câmara. Confirma permissão e tenta novamente.” | Covers the bottom of the empty camera box (see [Messages over the camera and controls](#messages-over-the-camera-and-controls)) |
| D5 empty, invalid, duplicate | As in the before captures                                                 | Covers neither the field nor Validar; focus returns to the code field                                                           |
| D7 export failed             | “Não foi possível exportar os CVs. Tenta novamente.”                      | Shown on a server error (500); the button is usable again                                                                       |

D7 success downloads `cvs-guardados.zip` with the Z101 and Z103 CVs and
`dados.csv`; there is no visible change on the page.

### D8: `/dashboard` without an employee profile

Student and admin sessions both get the shared 404 page, with no company
navigation.

![Student on the dashboard at 360](after-D8-360.png)

![Student on the dashboard at 1440](after-D8-1440.png)

![Admin on the dashboard at 360](after-D8-admin-360.png)

### S1: saved student by direct URL

Z101 has everything; Z102 has no avatar, links, CV, bio or interests; Z103
has long content everywhere.

![Z101 at 360](after-S1-Z101-360.png)

![Z101 at 768](after-S1-Z101-768.png)

![Z101 at 1440](after-S1-Z101-1440.png)

![Z102 at 360](after-S1-Z102-360.png)

![Z102 at 1440](after-S1-Z102-1440.png)

![Z103 at 360](after-S1-Z103-360.png)

![Z103 at 1440](after-S1-Z103-1440.png)

### S2 and S5: student route 404

S2 is an employee on a student their company has not saved; S5 is an invalid
preview token. Both render the shared 404 page.

![Not saved at 360](after-S2-360.png)

![Not saved at 1440](after-S2-1440.png)

![Invalid token at 360](after-S5-360.png)

### S3: signed preview of a student not saved yet

Z104 opened from a signed link without saving, with the save button.

![Unsaved preview at 360](after-S3-Z104-360.png)

![Unsaved preview at 768](after-S3-Z104-768.png)

![Unsaved preview at 1440](after-S3-Z104-1440.png)

### S4: preview of a saved student

`A123`, the same student as the before captures, plus Z103's long content.

![Saved preview at 360](after-S4-A123-360.png)

![Saved preview at 768](after-S4-A123-768.png)

![Saved preview at 1440](after-S4-A123-1440.png)

![Z103 saved preview at 360](after-S4-Z103-360.png)

![Z103 saved preview at 1440](after-S4-Z103-1440.png)

### S6: admin without a profile

![Z101 as admin at 360](after-S6-Z101-360.png)

![Z101 as admin at 1440](after-S6-Z101-1440.png)

![Z102 as admin at 360](after-S6-Z102-360.png)

![Z103 as admin at 360](after-S6-Z103-360.png)
