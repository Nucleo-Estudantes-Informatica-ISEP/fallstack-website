# Responsive layout verification — issue #408

Captured 13 November 2026 with headless Playwright Chromium on macOS. These
are browser viewport checks, **not real-device or production login evidence**.
Fixture controls at the top of each image are test-only. The temporary route
was removed after verification and is not shipped.

The fixture mounts the actual homepage, schedule, student onboarding and profile
components. It supplies a long student name, a long unbroken programme title,
empty dashboard data, and an intercepted QR response. It does not test AuthNEI,
attendance, Google Wallet issuance, or persistence of onboarding data.

Checked widths: **360, 400, 768, 1440, 1920 px**, height 900 px. All four
views (home/programme, onboarding, summary, pass) must fit the viewport without
horizontal document overflow or text/control boxes outside its bounds.
QR enlargement must open with Enter and close with Escape at every width.
The captured homepage also exercises both programme day buttons. Existing
unit tests check that menu changes focus the selected content and QR dismissal
returns focus to the trigger. Changed navigation and programme controls retain at least 44 px heights.

## Captures at 400 px

- [Homepage and programme](home-400.png)
- [Onboarding](signup-400.png)
- [Summary and stacked navigation](profile-400.png)
- [Pass and stacked navigation](pass-400.png)

The selected menu label precedes content; remaining entries follow it on mobile.
Desktop keeps navigation beside content. No hamburger interaction is introduced.
Page gutters grow progressively instead of jumping to 168 px at tablet widths.
The pass stacks its name/code, QR and actions without fixed-width clipping.

## Reproduce

Use a clean local checkout; do not copy this fixture into a deployed environment.

1. `mkdir -p src/app/responsive-check`
2. `cp tests/e2e/fixtures/responsive-page.tsx src/app/responsive-check/page.tsx`
3. Start `pnpm dev --port 3128` with local development settings.
4. `node tests/e2e/responsive-layout.mjs`
5. Stop the development server and remove only the temporary fixture:
   `rm src/app/responsive-check/page.tsx && rmdir src/app/responsive-check`

## PR review follow-up and closure scope

On 13 November 2026, the task owner explicitly waived the requested additional
device/live-flow evidence for closing #408 and requested code verification instead.
This waiver applies to #408 only; #344 retains its independent release gates.
No device, external AuthNEI or live Wallet success is implied.

The reviewed implementation uses the supplied stacked mobile menu, retains the
desktop sidebar, focuses selected content, and reuses the shared QR modal for
Escape, focus trapping and focus restoration. Fluid gutters/cards and wrapping
programme/history text address containment; controls retain visible focus and
accessible touch targets. The existing tests cover menu focus, QR dismissal and
unavailable QR states.

Additional local authenticated flow evidence is recorded in PR #582 for revision
`eee7027ede4a55e600bbec0c0db5a9a8ecfbb9e1`: onboarding returned HTTP 201,
profile and consent flags persisted, and navigation returned home. The actual
student route and QR API were exercised at all five widths, including QR JWT
signature/student-code verification and Enter/Escape. This follow-up inspected
that report; it did not rerun those flows.

The responsive fixture runner is a manual development script. Its JSON report
(`fallstack-408-viewports.json`) and failure screenshot
(`fallstack-408-failure.png`) use the operating system's temporary directory
(`os.tmpdir()`); successful 400 px captures use this evidence directory.
