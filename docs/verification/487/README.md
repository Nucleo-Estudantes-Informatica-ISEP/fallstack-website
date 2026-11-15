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
