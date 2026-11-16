# Student dashboard verification (#487)

Evidence for restyling the student dashboard (`/student/<own code>`).

- **Before:** `dev` at 0565c6dc (15 November 2026).
- **After:** `feat/student-dashboard-2026` at bb83e968 (15 November 2026).

Captured with `pnpm dev`, local Docker services and synthetic accounts only,
in headless Chrome at 360 × 800, 768 × 1024 and 1440 × 900. Design: Figma
exports in #487.

## Captures

| Tab                  | Before                                                                              | After                                                                            |
| -------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Sumário              | [360](before-A3-360.png) · [768](before-A3-768.png) · [1440](before-A3-1440.png)    | [360](after-A3-360.png) · [768](after-A3-768.png) · [1440](after-A3-1440.png)    |
| Passe do FallStack   | [360](before-A4-360.png) · [768](before-A4-768.png) · [1440](before-A4-1440.png)    | [360](after-A4-360.png) · [768](after-A4-768.png) · [1440](after-A4-1440.png)    |
| Desafios             | [360](before-A8-360.png) · [768](before-A8-768.png) · [1440](before-A8-1440.png)    | [360](after-A8-360.png) · [768](after-A8-768.png) · [1440](after-A8-1440.png)    |
| Informações pessoais | [360](before-A10-360.png) · [768](before-A10-768.png) · [1440](before-A10-1440.png) | [360](after-A10-360.png) · [768](after-A10-768.png) · [1440](after-A10-1440.png) |

Checked on the branch but not captured: empty summary and challenges, QR
loading, failed with retry, and enlarged (centred), the dark avatar dialog,
the CV-removed notice, the Logout confirmation, and the 404 page for another
student or a signed-out visitor. Toasts are not captured. The Google Wallet
button shows locally; a real Android phone is checked before review.

## What changed

- One section heading style in all tabs (Inter semibold, centred on mobile,
  left from `lg`). Name and email use the font tokens; the email wraps at the
  `@`. Logout sits a little apart from the menu.
- Sumário: "Sumário do teu perfil", thin dividers, "Empresa restante", and
  the scan history as a captioned, keyboard-scrollable table whose long
  company names wrap.
- Passe: the design's intro, the card beside the code from `lg`, a labelled
  copy button that announces "Copiado!", and a retry when the QR fails.
- Desafios: rounded `#2C2C2C` rows, no orange border, "1 ponto", and done
  state and hidden descriptions in words for screen readers.
- Informações pessoais: shared heading, dark avatar dialog, and the same
  dark overlay on its artwork as the other tabs (without it, header text fell
  to 2.5:1 at 1440 and 1920).
- The unreachable settings form (`SettingsSection`) is removed; the
  CV-removed notice points to Informações pessoais and no longer touches the
  email.

## Accessibility and overflow

Playwright, Chrome and axe-core 4.14 (WCAG 2.2 AA) as Z100, Y402 (long
texts) and Y403 (CV removed). Text over artwork or the card gradient is
measured against its worst pixel.

**Keyboard.** At 360 and at 1440, every stop on every tab shows a focus
outline. The QR, avatar and Logout dialogs keep focus inside, close on Escape
(Logout also on Cancelar) and return focus to their trigger. From `lg` the
content comes before the menu in focus order, as #582 laid it out.

| Text                                         | Background             | Ratio                |
| -------------------------------------------- | ---------------------- | -------------------- |
| White, `#F3F4F6` labels                      | `#141414` panel        | 18.4, 16.7:1         |
| White name, email, CV notice                 | artwork with overlay   | 7.1:1 or more        |
| `ui-muted` labels, headers, descriptions     | `#141414`, `#2C2C2C`   | 12.3, 9.3:1          |
| White challenge names                        | `#2C2C2C`              | 14.0:1               |
| Hints, SALVO, "Copiado!", counter over limit | `#141414`              | 7.1, 6.6, 6.3, 6.4:1 |
| White on the pass card                       | card gradient          | 7.5:1                |
| White Guardar, Confirmar                     | `#82360D`, `ui-action` | 8.5, 5.7:1           |

**Overflow.** No horizontal scroll at 360, 400, 768, 1440 and 1920 in any
state, with the long name, email and company name and a six-character code:
160 measurements.

**Open, in shared components (not changed here):** footer copyright
`#484848` (2.0:1); the Logout confirmation (`ConfirmDialog`) is white and its
"Sair" is black on `#B1440A` (3.7:1); `Modal`'s `role="dialog"` element
(axe, minor); the card's QR `svg` has no title, though its button is
labelled; `UserImage` alt text is English.

## Deliberate differences and known items

- Current `react-icons` menu icons; the current entry keeps its orange
  border and `aria-current`; mobile navigation as #582 left it (#479).
- Scanner entry points remain role-gated and separate from the student menu.
  Offline pass download and Google Wallet actions are provided by the pass
  view (#406).
- The design's `#666666` text would be 3.2:1, so text uses `ui-muted` and
  lines `ui-border`.
- Fields are 44 px high (design 42) and 6 px further apart; interest pills
  size to their text (`InterestSelector` is shared). Curso and the read-only
  hints stay. Guardar uses the design's `#82360D`.
- The pass card is unchanged (D3), so the name shows twice and the code
  appears in the card and the code block.
- `Profile/Input` is unused. Company profile scanning is supplied by #516 and
  attendance scanning by #470; this dashboard PR consumes those existing
  role-gated flows.

## Checks

On bcb42a3e, with the task's own local database:

- `pnpm lint`, `pnpm typecheck`, `pnpm exec prisma validate`,
  `git diff --check` and Prettier on the changed Markdown pass.
- `pnpm test`: 1,359 passed, 12 skipped, 3 failed. The 3 are the same as on
  `dev` before this work: two Windows-only `pnpm` spawn tests and one timeout
  on a slow machine.
- `pnpm build` compiles and generates all 51 pages, then fails only at the
  standalone copy, which needs symlinks on Windows. CI builds on Linux.

**Student flow** (Z100, 1440 and 360): every tab opens; copy puts the code on
the clipboard and announces it; the QR enlarges and closes; biography and an
interest are saved, survive a reload and are restored; Logout asks first and
Cancelar keeps the session.

**Who else opens `/student/Z100`:** signed out and another student get the
404 page; the company that saved Z100 and an admin get the profile view. No
one but Z100 gets the dashboard.

**Company scanner, as on `dev`:** Chrome's fake camera, fed the restyled
pass, reads the right code for Y402 and for the six-character Y4Q7K2. The
save that follows is rejected by the server on current `dev`, which this
branch does not change; raised separately. The typed code (Y401) saves, and
the company then appears in Y401's Sumário. Test saves were removed.

**Real device:** pending (a phone showing the pass, a second device
scanning it, and the Google Wallet button on Android).

## Scanner pages

Students show their pass; companies scan it. Scan de Perfil is supplied by
#516, and Scan de Palestras is supplied by #470. The attendance scanner keeps
its phone-first light layout from #470 rather than adopting the dark desktop
Figma frame, because it is a separate role-gated flow:

| Item                 | Figma                                                | #516                                                               | Result                          |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------- |
| Heading, intro       | "Scan", the stand sentence                           | Same text                                                          | Same                            |
| Order                | Intro, camera, code, history                         | Same                                                               | Same                            |
| Camera box           | Full panel width                                     | About 92% wide, centred; camera hint under it                      | Narrower; hint intended         |
| Typed code           | Bordered field, Validar inside, placeholder "código" | Same shape; label added, "CÓDIGO", Validar in `ui-action`          | Label intended; case, colour    |
| Hint                 | "ou introduza o código…", small grey                 | "Introduza o código…", larger and lighter                          | Wording follows the camera hint |
| History              | Nome, Data; centred white header, white line         | Adds Comentário, Download CVs and Carregar mais; header left, grey | Additions intended; alignment   |
| Against student tabs | One style                                            | Same panel and fonts; headings left at 360; heavier table header   | Differs (D6, company files)     |
