# Logo sizing verification (#480)

Partner cards use two equal cells per row below 768 px and four above it,
with incomplete rows centered. Images fit inside a 160 px maximum width,
96/112 px high cell using `object-contain`. Database logo dimensions and CSS
classes remain stored for compatibility but cannot change these cards.
The main hero artwork keeps its aspect ratio and is capped at 224 px (previously
320 px), using half the viewport width on narrow screens.
Featured hero logos retain their separate existing 128 × 64 px cells.
Sponsor acknowledgements use separate 96–128 px wide, 64–96 px high cells.
Footer artwork is capped at 192 px; 28 px social artwork retains 44 px
minimum link targets. The install control uses its normal icon size inside a
44 px target. Help and section titles use 30/36 px responsive type.

These are implementation choices following the supplied Figma proportions.
No content, colors or dates change.

## Required staging review

At 360, 768, 1440 and 1920 px, open the full homepage with actual uploaded
company and sponsor media. Check every active rank, wide/tall/transparent
artwork, centered incomplete rows, absence of horizontal overflow, logo
aspect ratios, footer links and install control. Capture screenshots at each
width and record the revision and environment. Do not substitute example
Figma logos for database uploads.

## Review completed — 11 November 2026

Checked the changed components in the managed browser at actual CSS viewport
widths 360, 768, 1440 and 1920 px. A temporary local QA route rendered the
production public roster and downloaded, unchanged uploaded media; it was
removed after review. This is component verification, not deployment evidence
for the currently public countdown homepage.

All available company and sponsor images loaded, used contained bounds, and
produced no horizontal document overflow. Tier cells have equal widths and
96/112 px height; desktop complete rows contain four cells and incomplete
rows are centered. Footer social/install/privacy controls retain 44 px targets.
Headings render at 30/36 px. Sponsor strip needed a full-width wrapper to avoid
unnecessary wrapping on desktop; corrected and visually rechecked.

The review included the newly uploaded GILT, AIESEC, NBanks and Virtual Campus
logos. Their website records were empty before upload; existing artwork was
not replaced. GILT GIF was converted to PNG; Virtual Campus's EPS supplied a
sheet of variants, from which the complete primary color logo was exported.
Remaining missing production uploads: Ordem dos Engenheiros Técnicos, Euronext,
ITIM Group plc, Critical Manufacturing and DevScope. They are absent from the
supplied Drive/form submissions and render name fallbacks.

See `logo-sizing-results.json` for browser measurements. Screenshots were
retained in the local browser artifacts directory. Existing black artwork
(e.g. ARMIS/ITSector) has low contrast on the dark background; sizing does not
alter supplied artwork or brand colors.

## Production upload summary — 13 November 2026

Four company rows received missing logos: GILT, Virtual Campus, AIESEC and
NBanks. Production row identifiers and storage object keys are omitted from
this public summary and the PR description.
The original upload session recorded empty previous logo values but did not
retain their exact SQL representation or an independent before-state export.
Earlier Git revisions still contain production identifiers; removing them from
the current document does not purge that history. No private operations copy
was created in this follow-up, so this public summary is not a complete
row-level rollback record.

## Follow-up verification — 13 November 2026

A local production build rendered the changed homepage components with a fresh
public production roster and unchanged downloaded uploads, via a temporary QA
route. Playwright visited every tier and the lazy footer logo; all 24 images
loaded. Assertions checked contained images, equal tier-cell heights, centered
rows, four cells in complete desktop rows, no document overflow and 44 px
footer controls. Screenshots at all four widths were inspected. The QA route
and downloaded copies were removed after verification.

| CSS viewport | Hero width | Document width | Images loaded |
| ------------ | ---------- | -------------- | ------------- |
| 360 px       | 140 px     | 360 px         | 24            |
| 768 px       | 216 px     | 768 px         | 24            |
| 1440 px      | 224 px     | 1440 px        | 24            |
| 1920 px      | 224 px     | 1920 px        | 24            |

`pnpm lint`, `pnpm typecheck`, `pnpm build` and Prisma validation passed.
The full suite passed against an isolated, migrated local PostgreSQL database:
1,103 tests passed and 10 skipped. The initial unconfigured database run did
not pass and is not used as validation evidence. Development navigation
returned HTTP 200, but stalled under memory pressure; the completed visual
checks used the production build. This verifies components, not deployment of
the full homepage on production.

## Integrated-head verification — 15 November 2026

Rechecked application revision `c9b9e8654e8f6a4feae03bea53e07d22f4845eda`
(the integrated PR #557 head, including the SVG changes). This follow-up adds
only this report and screenshots; the application files are unchanged.

Environment: local Next.js 15.5.29 development server on macOS, Node 26.13.1,
and T3's managed Chromium browser. A temporary `/qa-logos` route rendered the
unchanged `HomePage`, `CompaniesSection` and `SponsorsSection` components with
the public production roster retrieved that day: 18 partners across all five
active ranks and three sponsors. Schedule and FAQ slots were empty. The 21
uploaded PNGs were copied unchanged into task-owned local MinIO and served
through the unchanged application media route. No production records or
uploads were modified.

The production roster contained no SVGs. To check the integrated SVG path,
`tests/fixtures/svg/logo.svg` was submitted as multipart data to the real
`uploadFile("logo", request)` service and stored in that isolated MinIO. Its
sanitized 300-byte result was rendered through the real media route in an
additional, explicitly local partner tier and sponsor cell. This checks the
upload service, storage, media response and both rendering components; it does
not claim an authenticated admin-form or production SVG upload. The media
response returned HTTP 200, `image/svg+xml`, `nosniff` and the SVG sandbox CSP.
Both SVG images loaded directly from the media API, without an optimizer URL
or `srcset`, and retained their square artwork inside `object-contain` bounds.

| CSS viewport width | Document width | Hero width | Tier cell height | Images loaded |
| ------------------ | -------------- | ---------- | ---------------- | ------------- |
| 360 px             | 345 px         | 156.5 px   | 96 px            | 25 / 25       |
| 768 px             | 753 px         | 224 px     | 112 px           | 25 / 25       |
| 1440 px            | 1425 px        | 224 px     | 112 px           | 25 / 25       |
| 1920 px            | 1905 px        | 224 px     | 112 px           | 25 / 25       |

The browser's vertical scrollbar occupies 15 px. DOM assertions found no
horizontal overflow at any width. Every tier had equal cell widths and
heights; complete rows contained two cells at 360 px and four at the other
widths. Incomplete rows were centered (measured center error 0 px). All
uploaded images loaded, partner image bounds remained at most 160 px wide,
and artwork used `object-contain`. All seven footer social/install/privacy
controls measured 44 × 44 px. A synthetic `beforeinstallprompt` event exposed
the install control for measurement; installation itself was not exercised.

Screenshots were inspected at each width, including every production partner,
the three production sponsors and both SVG cells. Wide, tall and transparent
artwork remained contained without stretching or clipping. Existing dark
artwork remains low contrast on the dark background; supplied colors were
preserved. The screenshots use a 1100 px viewport height and cover successive
scroll positions:

| Width   | Upper partner tiers     | Remaining partner tiers       | SVG, sponsors and footer      |
| ------- | ----------------------- | ----------------------------- | ----------------------------- |
| 360 px  | [Top](557/360-top.png)  | [Middle](557/360-middle.png)  | [Bottom](557/360-bottom.png)  |
| 768 px  | [Top](557/768-top.png)  | [Middle](557/768-middle.png)  | [Bottom](557/768-bottom.png)  |
| 1440 px | [Top](557/1440-top.png) | [Middle](557/1440-middle.png) | [Bottom](557/1440-bottom.png) |
| 1920 px | [Top](557/1920-top.png) | [Middle](557/1920-middle.png) | [Bottom](557/1920-bottom.png) |

The temporary route, scripts and downloaded media were removed; the local
server, MinIO container and task-created browser tab were stopped/closed.
This is fresh local component/media integration evidence, not evidence of
full-homepage deployment or a real-device PWA check. No application-wide checks
were rerun for this documentation-only follow-up: GitHub quality (tests, lint,
typecheck and build), production Docker, security and CodeQL checks were
inspected as successful for the unchanged application revision `c9b9e865`.
