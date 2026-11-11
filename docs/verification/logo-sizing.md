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

Pending: real uploaded-media checks at all four widths and Ricardo Meireles's
explicit confirmation that sizes look regular. Local checkout has no configured
database/media environment; the automated override regression test does not
replace this visual review.
