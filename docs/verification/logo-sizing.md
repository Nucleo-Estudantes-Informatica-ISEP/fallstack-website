# Logo sizing verification (#480)

Partner cards use two equal cells per row below 768 px and four above it,
with incomplete rows centered. Images fit inside a 160 px maximum width,
96/112 px high cell using `object-contain`. Database logo dimensions and CSS
classes remain stored for compatibility but cannot change these cards.
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
