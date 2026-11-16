# Company and privacy layout verification (#488)

Implementation is based on dev `0565c6dc` and the 30 October handoff.
Company data remains database-owned; no mock company content is shipped.
The contact section uses the public company website because the current profile
schema has no public contact email. Employee emails are not exposed.

The privacy policy JSX content was compared with the base after removing class
attributes and normalizing the outer `main` to `div`: identical. Existing
version, effective date and attendance/check-in paragraphs are retained.
The outer `div` avoids nesting a second main landmark inside GuestLayout.

Checks run on macOS with Node 24 and pnpm 10, sequentially. PostgreSQL 16 was
initialized specifically for this task on loopback port 55488, migrations
applied, and both DATABASE_URL and DIRECT_URL explicitly set for checks.

Visual verification uses a temporary development-only route rendering the actual
CompanyPageSection with isolated fixture props, including a long website URL,
with and without a permitted YouTube video. The privacy route uses its real
policy content. The fixture route is removed before commit. Screenshots are
implementation evidence, not production company data or design approval.

Results on the final implementation (before documentation-only additions):

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm exec prisma validate`: pass.
- `pnpm test`: 200 files passed, 2 skipped; 1,190 tests passed, 12 skipped.
- Focused company tests: five passed, including uploaded MP4 controls,
  permitted YouTube URLs, disabled/invalid/absent media, public contact and
  accessible social links, and missing-logo fallback.
- Dev Chromium: all six page/viewport combinations returned HTTP 200 with no
  horizontal overflow. Checked at 390 and 1512 CSS pixels; inspected screenshots
  for company with/without video and privacy. The long URL wraps within the card.
- Privacy content comparison with the base passed. `git diff --check` passed.

Screenshots below use fixture identity and the repository NEI logo solely to
exercise logo containment. YouTube iframe geometry is covered; external video
playback and authenticated production company data were not verified. The
Next.js development indicator was hidden for captures only. No production style
or configuration was changed to hide errors.

| Layout                | Mobile                          | Desktop                           |
| --------------------- | ------------------------------- | --------------------------------- |
| Company without video | [390 px](company-390.png)       | [1512 px](company-1512.png)       |
| Company with video    | [390 px](company-video-390.png) | [1512 px](company-video-1512.png) |
| Privacy               | [390 px](privacy-390.png)       | [1512 px](privacy-1512.png)       |

The initial unisolated run reported schema drift against the default local test
DB. That result is superseded by the complete passing run on the migrated,
task-owned database. No schema changes were needed for this issue.
