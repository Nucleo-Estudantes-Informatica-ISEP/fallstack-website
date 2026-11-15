# Student dashboard verification (#487)

Evidence for restyling the student dashboard (`/student/<own code>`).

- **Before:** `dev` at 0565c6dc (15 November 2026).
- **After:** pending.

Captured with `pnpm dev`, local Docker services and synthetic accounts only,
in headless Chrome at 360 × 800, 768 × 1024 and 1440 × 900.

## Captures

| Tab                  | Before                                                                              | After |
| -------------------- | ----------------------------------------------------------------------------------- | ----- |
| Sumário              | [360](before-A3-360.png) · [768](before-A3-768.png) · [1440](before-A3-1440.png)    | –     |
| Passe do FallStack   | [360](before-A4-360.png) · [768](before-A4-768.png) · [1440](before-A4-1440.png)    | –     |
| Desafios             | [360](before-A8-360.png) · [768](before-A8-768.png) · [1440](before-A8-1440.png)    | –     |
| Informações pessoais | [360](before-A10-360.png) · [768](before-A10-768.png) · [1440](before-A10-1440.png) | –     |

Also checked, not captured: empty summary, QR loading and failed, enlarged
QR, empty challenges, avatar dialog, CV-removed notice, Logout confirmation,
and the 404 page for another student or a signed-out visitor. No state
scrolls horizontally.

Design: Figma exports in #487.

## Accessibility and overflow

Checked on the restyled branch with Playwright, Chrome and axe-core 4.14
(WCAG 2.2 AA tags), as Z100, Y402 (long name, email and texts) and Y403 (CV
removed). The header was sampled pixel by pixel over the artwork, and its
worst pixel is the one in the table.

**Keyboard.** At 360 and at 1440, every stop on every tab shows a focus
outline. The enlarged QR, avatar and Logout dialogs keep focus inside, close on
Escape (Logout also on Cancelar) and return focus to the control that opened
them. The scan history box is focusable when it scrolls. From `lg` the
content comes before the menu in the focus order, as #582 laid it out.

| Text                                   | Background                        | Ratio        |
| -------------------------------------- | --------------------------------- | ------------ |
| White (headings, values, rows, fields) | `#141414` panel                   | 18.4:1       |
| `#F3F4F6` field labels, header email   | `#141414` / artwork with overlay  | 16.7 / 7.3:1 |
| `ui-muted` stat labels, table headers  | `#141414`                         | 12.3:1       |
| White name, CV notice                  | artwork with overlay, worst pixel | 7.1:1        |
| White challenge names                  | `ui-surface-raised` `#2C2C2C`     | 14.0:1       |
| `ui-muted` descriptions, points        | `#2C2C2C`                         | 9.3:1        |
| `#99A1AF` field hints                  | `#141414`                         | 7.1:1        |
| `#F97316` SALVO                        | `#141414`                         | 6.6:1        |
| `ui-highlight` "Copiado!"              | `#141414`                         | 6.3:1        |
| `#FF6467` counter over the limit       | `#141414`                         | 6.4:1        |
| White on the pass card                 | card gradient, worst pixel        | 7.5:1        |
| White Guardar / Confirmar              | `#82360D` / `ui-action`           | 8.5 / 5.7:1  |

**Overflow.** `scrollWidth` equals `clientWidth` at 360, 400, 768, 1440 and
1920 for every state: header and CV notice, each tab, long name and email,
long company name, six-character code, QR loading, failed and enlarged,
empty challenges, Logout confirmation and the 404 page. That is 160
measurements, none scrolling.

**Fixed in the sweep.** Informações pessoais now has the same dark overlay
over its artwork as the other tabs; without it the long name, email and CV
notice fell to 2.5–2.8:1 at 1440 and 1920. The CV notice no longer touches
the email. The scan history box is keyboard-focusable and labelled.

**Open, in shared components (not changed here):**

- Footer copyright `#484848` on `#141414`: 2.0:1.
- Logout confirmation (`ConfirmDialog`, also used by admin, company and the
  top bar): white, and "Sair" is black on `#B1440A`, 3.7:1.
- `Modal` puts `role="dialog"` on an element axe does not allow it on.
- The QR `svg` has `role="img"` with no title; its button is labelled. The
  pass card is left as it is (D3).
- `UserImage` alt text is English ("profile image").

## Findings before the restyle

- Each tab has its own heading style; the design uses one.
- A long company name runs over the Data and Ação columns in the scan
  history. Table lines and stat dividers are thick white; the design's are
  thin grey.
- Long emails break mid-word at 360.
- The CV-removed notice points to "Definições", which has no menu entry.
- The pass code appears in the card and again in an unlabelled copy button.
  A failed QR request shows only "Sem QR", with no retry.
- The enlarged QR dialog is off-centre at 1440.
- Challenge rows have orange borders, and one point reads "1 pontos".
- The avatar dialog and the Logout confirmation are white, in the old style.

## Deliberate differences from the design

- Current `react-icons` menu icons; the design's glyphs are not in the
  repository.
- The current menu entry keeps its orange border and `aria-current`.
- Mobile navigation stays as #582 left it (no hamburger, #479).
- No scanner entries in the student menu, and no Apple Wallet or Download
  PNG buttons (#406).
- Buttons use the `ui-action` colour from #515.
- Informações pessoais keeps the Curso field.

## Scanner pages

Students show their pass; companies scan it. Scan de Perfil belongs to #516
and Scan de Palestras to #470. This task edits no scanner file; it checks
that the company scanner still reads the restyled pass.
