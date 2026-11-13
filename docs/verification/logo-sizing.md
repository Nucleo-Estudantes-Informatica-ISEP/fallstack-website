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

These are implementation choices following the supplied Figma proportions;
they are not a claim of Ricardo's approval. No content, colors or dates change.

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

Ricardo's confirmation is accepted as supplied by the user in this session;
no independent message from Ricardo approving this revision was inspected.

## Production upload trace — 13 November 2026

Read-only verification against the public production `/api/companies/roster`
response identified these rows and media URLs. The media route maps each logo
UUID to `distribution/logo/<UUID>` in the configured logo bucket.

| Company        | Company ID                             | Uploaded object key                                      |
| -------------- | -------------------------------------- | -------------------------------------------------------- |
| GILT           | `c082e04e-1abc-489c-8cb8-ab362672b137` | `distribution/logo/1620f233-b33a-4fd5-b2cf-5e7e2975aa87` |
| Virtual Campus | `38f036c7-0a5d-4f9d-af0a-d87329d22f89` | `distribution/logo/967578c4-07b0-47b1-a159-e877d0816f34` |
| AIESEC         | `6f91e8b8-e61c-4fe3-984e-7173f30d72ea` | `distribution/logo/db2c4f43-2d96-435f-8a53-cdbee8f133b6` |
| NBanks         | `9359b51b-a678-4794-9f9a-e6293a4c08f0` | `distribution/logo/db5d43b3-cd2a-49b1-9429-2bec25f1476e` |

The original upload session recorded the previous logo value as empty for all
four rows. It did not retain whether that empty value was SQL NULL or an empty
string, nor an independent before-state export. The current roster verifies
row/media identity, not that historical state. To revert the recorded content
change, clear only the listed company's logo association through the admin;
check current use before removing any storage object.

Production upload authorization is recorded in the original task on
11 November 2026: the user requested adding the missing logos from Drive and
instructed not to add them again where they already existed. That task also
explicitly instructed accepting Ricardo's confirmation and proceeding. Treat
that as owner-accepted sign-off; no direct message from Ricardo approving this
revision was inspected. This follow-up only reads public production data and
makes no production content changes.

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
