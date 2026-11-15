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
- No scanner entries in the student menu, and no Apple Wallet or Download
  PNG buttons (#406).
- The design's `#666666` text would be 3.2:1, so text uses `ui-muted` and
  lines `ui-border`.
- Fields are 44 px high (design 42) and 6 px further apart; interest pills
  size to their text (`InterestSelector` is shared). Curso and the read-only
  hints stay. Guardar uses the design's `#82360D`.
- The pass card is unchanged (D3), so the name shows twice and the code
  appears in the card and the code block.
- `Profile/Input` is unused. Until #516 merges, the company summary on `dev`
  also shows the new history table.

## Scanner pages

Students show their pass; companies scan it. Scan de Perfil belongs to #516
and Scan de Palestras to #470. This task edits no scanner file; it checks
that the company scanner still reads the restyled pass.
