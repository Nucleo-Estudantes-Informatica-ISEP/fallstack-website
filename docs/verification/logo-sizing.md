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
NBanks. The row identifiers, object keys, authorization record and reversal
notes are retained in the [PR #557 description](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/557).
The original upload session recorded empty previous logo values but did not
retain their exact SQL representation or an independent before-state export.

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
